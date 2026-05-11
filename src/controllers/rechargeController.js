const User = require('../models/User');
const Transaction = require('../models/Transaction');

exports.rechargePhone = async (req, res) => {
  try {
    const { phoneNumber, operator, amount } = req.body;
    const amountNum = parseFloat(amount);
    const user = await User.findById(req.user._id);
    if (user.wallet.balance < amountNum)
      return res.status(400).json({ success: false, message: 'Solde insuffisant' });
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'wallet.balance': -amountNum } });
    const tx = await Transaction.create({
      sender: req.user._id, type: 'recharge_phone', amount: amountNum,
      fees: 0, status: 'completed', phoneNumber, operator,
      description: `Recharge ${operator} - ${phoneNumber}`, category: 'bills',
    });
    res.json({ success: true, message: `Recharge ${operator} effectuée`, transaction: tx });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getOperators = async (req, res) => {
  res.json({ success: true, operators: [
    { id: 'Ooredoo',          name: 'Ooredoo',           color: '#EF4444', amounts: [1,2,3,5,10,15,20] },
    { id: 'Orange',           name: 'Orange',            color: '#F97316', amounts: [1,2,3,5,10,15,20] },
    { id: 'TunisieTelecom',   name: 'Tunisie Télécom',  color: '#6366F1', amounts: [1,2,3,5,10,15,20] },
  ]});
};
