const Groq = require("groq-sdk");
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Build financial context from user data
const buildFinancialContext = async (userId) => {
  const user = await User.findById(userId).select('-password');
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthlyTx = await Transaction.find({
    sender: userId,
    createdAt: { $gte: startOfMonth },
    status: 'completed',
  });

  const spending = monthlyTx.reduce((acc, tx) => {
    acc.total += tx.amount;
    acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
    return acc;
  }, { total: 0 });

  return {
    userName: user.firstName,
    walletBalance: user.wallet.balance,
    savingsBalance: user.savingsAccount.balance,
    savingsRate: user.savingsAccount.interestRate,
    monthlyBudget: user.monthlyBudget,
    savingsGoal: user.savingsGoal,
    monthlySpending: spending,
    financialProfile: user.financialProfile,
    currency: 'TND',
  };
};

// @POST /api/ai/chat
exports.chat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message requis' });
    }

    const context = await buildFinancialContext(req.user._id);
    const user = await User.findById(req.user._id);

    const recentHistory = (user.aiChatHistory || []).slice(-10);

    const systemPrompt = `Tu es FloucIA, un conseiller financier intelligent intégré dans une app wallet tunisienne.

Profil utilisateur :
- Solde: ${context.walletBalance.toFixed(3)} TND
- Épargne: ${context.savingsBalance.toFixed(3)} TND
- Budget: ${context.monthlyBudget} TND
- Dépenses: ${context.monthlySpending.total?.toFixed(3) || 0} TND
- Revenu: ${context.financialProfile?.monthlyIncome || 0} TND

Sois court (3-4 phrases max), pratique et clair.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...recentHistory.map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: "user", content: message }
    ];

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile", // 🔥 meilleur gratuit
      messages,
      max_tokens: 500,
    });

    const aiReply = response.choices[0].message.content;

    // Save history
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        aiChatHistory: {
          $each: [
            { role: 'user', content: message },
            { role: 'assistant', content: aiReply },
          ],
          $slice: -50,
        },
      },
    });

    res.json({ success: true, reply: aiReply });

  } catch (err) {
    console.error('AI Error:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur IA: ' + err.message
    });
  }
};

// @GET /api/ai/analysis
exports.getFinancialAnalysis = async (req, res) => {
  try {
    const context = await buildFinancialContext(req.user._id);

    const prompt = `Génère une analyse financière complète en JSON pour ${context.userName} avec ces données :
${JSON.stringify(context, null, 2)}

Réponds UNIQUEMENT avec un JSON valide (sans markdown) avec cette structure :
{
  "score": <0-100>,
  "scoreLabel": "<Excellent|Bon|Moyen|À améliorer>",
  "budgetUsage": <pourcentage>,
  "savingsProgress": <pourcentage vers objectif>,
  "topCategory": "<catégorie la plus dépensée>",
  "insights": ["<conseil 1>", "<conseil 2>", "<conseil 3>"],
  "alerts": ["<alerte si applicable>"],
  "monthlyPlan": {
    "needs": <50% du revenu>,
    "wants": <30% du revenu>,
    "savings": <20% du revenu>
  },
  "recommendation": "<recommandation principale en 1 phrase>"
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    let analysis;
    try {
      const text = response.content[0].text.replace(/```json|```/g, '').trim();
      analysis = JSON.parse(text);
    } catch {
      analysis = { score: 50, scoreLabel: 'Moyen', recommendation: 'Données insuffisantes pour une analyse complète.' };
    }

    res.json({ success: true, analysis, context });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/ai/tips
exports.getDailyTips = async (req, res) => {
  try {
    const context = await buildFinancialContext(req.user._id);

    const budgetUsed = context.monthlyBudget > 0
      ? (context.monthlySpending.total / context.monthlyBudget * 100).toFixed(0)
      : 0;

    const prompt = `Génère 3 conseils financiers courts et pratiques adaptés au contexte tunisien pour quelqu'un qui a :
- Solde: ${context.walletBalance} TND
- Épargne: ${context.savingsBalance} TND  
- Budget utilisé ce mois: ${budgetUsed}%
- Objectif: ${context.financialProfile?.primaryGoal}

Réponds en JSON uniquement: {"tips": ["conseil 1", "conseil 2", "conseil 3"]}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // gratuit et puissant
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    let tips = {
      tips: [
        "Épargnez 20% de vos revenus",
        "Suivez vos dépenses quotidiennement",
        "Fixez un budget mensuel réaliste"
      ]
    };

    try {
      const text = completion.choices[0].message.content
        .replace(/```json|```/g, '')
        .trim();

      tips = JSON.parse(text);
    } catch (e) {
      console.log("Parsing error:", e.message);
    }

    res.json({ success: true, tips: tips.tips });

  } catch (err) {
    console.error("GROQ ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// @DELETE /api/ai/history
exports.clearHistory = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $set: { aiChatHistory: [] } });
  res.json({ success: true, message: 'Historique effacé' });
};
