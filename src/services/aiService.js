// src/services/aiService.js
const Anthropic = require('@anthropic-ai/sdk');
const Transaction = require('../models/Transaction');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Build a rich financial context object for a given user.
 */
exports.buildUserContext = async (user) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Transactions this month (sent by user)
  const txThisMonth = await Transaction.find({
    sender: user._id,
    status: 'completed',
    createdAt: { $gte: startOfMonth },
  });

  // Transactions last month (for comparison)
  const txLastMonth = await Transaction.find({
    sender: user._id,
    status: 'completed',
    createdAt: { $gte: startOfLastMonth, $lt: startOfMonth },
  });

  const sumByCategory = (txList) =>
    txList.reduce((acc, tx) => {
      acc.total = (acc.total || 0) + tx.amount;
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});

  const thisMonthSpend  = sumByCategory(txThisMonth);
  const lastMonthSpend  = sumByCategory(txLastMonth);
  const budgetUsagePct  = user.monthlyBudget > 0
    ? ((thisMonthSpend.total || 0) / user.monthlyBudget * 100).toFixed(1)
    : null;
  const savingsProgress = user.savingsGoal > 0
    ? ((user.savingsAccount.balance / user.savingsGoal) * 100).toFixed(1)
    : null;

  return {
    userName:       user.firstName,
    walletBalance:  user.wallet.balance,
    savingsBalance: user.savingsAccount.balance,
    interestRate:   user.savingsAccount.interestRate,
    monthlyBudget:  user.monthlyBudget,
    savingsGoal:    user.savingsGoal,
    financialProfile: user.financialProfile,
    thisMonth:  { spend: thisMonthSpend,  txCount: txThisMonth.length },
    lastMonth:  { spend: lastMonthSpend,  txCount: txLastMonth.length },
    budgetUsagePct,
    savingsProgress,
    currency: 'TND',
  };
};

/**
 * Build the system prompt injected into every chat request.
 */
exports.buildSystemPrompt = (ctx) => `
Tu es FloucIA, un conseiller financier personnel intelligent intégré dans l'application de wallet tunisienne FloucIA.
Tu parles UNIQUEMENT en français. Tu es bienveillant, direct et pratique.
Tu connais parfaitement le contexte tunisien : monnaie TND (dinar tunisien), STEG, SONEDE, Ooredoo, Orange, Tunisie Télécom, CNSS, banques tunisiennes, etc.

═══ PROFIL FINANCIER DE ${ctx.userName.toUpperCase()} ═══
💰 Solde wallet     : ${ctx.walletBalance.toFixed(3)} TND
🏦 Épargne          : ${ctx.savingsBalance.toFixed(3)} TND  (taux : ${ctx.interestRate}%/an)
📊 Budget mensuel   : ${ctx.monthlyBudget > 0 ? ctx.monthlyBudget + ' TND' : 'Non défini'}
🎯 Objectif épargne : ${ctx.savingsGoal > 0 ? ctx.savingsGoal + ' TND' : 'Non défini'}
📈 Budget utilisé   : ${ctx.budgetUsagePct !== null ? ctx.budgetUsagePct + '%' : 'N/A'}
🎯 Progression épar.: ${ctx.savingsProgress !== null ? ctx.savingsProgress + '%' : 'N/A'}
💼 Revenu mensuel   : ${ctx.financialProfile?.monthlyIncome > 0 ? ctx.financialProfile.monthlyIncome + ' TND' : 'Non renseigné'}
⚖️  Profil risque    : ${ctx.financialProfile?.riskTolerance || 'medium'}

📉 Dépenses ce mois (${ctx.thisMonth.txCount} tx) :
${Object.entries(ctx.thisMonth.spend)
  .filter(([k]) => k !== 'total')
  .map(([cat, val]) => `  • ${cat}: ${Number(val).toFixed(3)} TND`)
  .join('\n') || '  • Aucune dépense enregistrée'}
Total : ${(ctx.thisMonth.spend.total || 0).toFixed(3)} TND

📉 Dépenses mois précédent :
Total : ${(ctx.lastMonth.spend.total || 0).toFixed(3)} TND (${ctx.lastMonth.txCount} tx)

═══ TES MISSIONS ═══
1. Analyser les dépenses et identifier les tendances
2. Proposer des stratégies d'épargne concrètes adaptées au contexte tunisien
3. Alerter si le budget mensuel est dépassé ou en voie de l'être
4. Expliquer les fonctionnalités de FloucIA (épargne 7%/an, virements, recharge, factures, QR Pay)
5. Aider à créer un plan budgétaire (méthode 50/30/20)
6. Répondre aux questions de finance personnelle
7. Ne JAMAIS donner de conseils d'investissement risqués (actions, crypto) si profil "low"

═══ STYLE DE RÉPONSE ═══
• Concis et pratique (max 4 phrases sauf si analyse détaillée demandée)
• Utilise des emojis avec modération
• Exemples chiffrés en TND
• Toujours terminer par une action concrète si pertinent
`.trim();

/**
 * Call Claude API for chat completion.
 */
exports.callClaude = async ({ systemPrompt, messages, maxTokens = 1000 }) => {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });
  return response.content[0].text;
};

/**
 * Auto-tag a transaction category using Claude.
 * Called asynchronously after transaction creation (fire-and-forget).
 */
exports.autoTagTransaction = async (tx) => {
  try {
    const prompt = `Classifie cette transaction en une seule catégorie parmi : food, transport, shopping, bills, entertainment, health, education, savings, other.
Transaction: type="${tx.type}", description="${tx.description}", montant=${tx.amount} TND
Réponds UNIQUEMENT avec le mot de la catégorie, rien d'autre.`;
    const category = await exports.callClaude({
      systemPrompt: 'Tu es un classificateur de transactions financières. Réponds uniquement avec la catégorie.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 20,
    });
    const validCategories = ['food', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'education', 'savings', 'other'];
    const clean = category.trim().toLowerCase();
    if (validCategories.includes(clean)) {
      const Transaction = require('../models/Transaction');
      await Transaction.findByIdAndUpdate(tx._id, { category: clean, aiTagged: true });
    }
  } catch (_) {
    // Silent fail — tagging is non-critical
  }
};
