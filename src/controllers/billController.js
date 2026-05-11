const User = require('../models/User');
const Transaction = require('../models/Transaction');

exports.payBill = async (req, res) => {
  try {
    const { billType, reference, amount } = req.body;
    const amountNum = parseFloat(amount);
    const user = await User.findById(req.user._id);
    if (user.wallet.balance < amountNum)
      return res.status(400).json({ success: false, message: 'Solde insuffisant' });
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'wallet.balance': -amountNum } });
    const tx = await Transaction.create({
      sender: req.user._id, type: 'bill_payment', amount: amountNum,
      fees: 0, status: 'completed', billRef: reference,
      description: `Paiement ${billType} - Réf: ${reference}`, category: 'bills',
    });
    res.json({ success: true, message: `Facture ${billType} payée`, transaction: tx });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getBillOperators = async (req, res) => {
  res.json({ success: true, operators: [
    { id: 'STEG',         name: 'STEG',              icon: '⚡', color: '#F59E0B' },
    { id: 'SONEDE',       name: 'SONEDE',             icon: '💧', color: '#3B82F6' },
    { id: 'TOPNET',       name: 'Topnet',             icon: '🌐', color: '#8B5CF6' },
    { id: 'OOREDOO_POST', name: 'Ooredoo Postpayé',  icon: '📱', color: '#EF4444' },
    { id: 'ORANGE_POST',  name: 'Orange Postpayé',   icon: '📱', color: '#F97316' },
  ]});
};
