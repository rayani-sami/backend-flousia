const User = require('../models/User');
const Transaction = require('../models/Transaction');

// @GET /api/wallet/balance
exports.getBalance = async (req, res) => {
  const user = await User.findById(req.user._id).select('wallet savingsAccount firstName lastName');
  res.json({ success: true, wallet: user.wallet, savings: user.savingsAccount });
};

// @POST /api/wallet/send
exports.sendMoney = async (req, res) => {
  try {
    const { receiverPhone, amount, note } = req.body;
    const amountNum = parseFloat(amount);
    if (amountNum <= 0) return res.status(400).json({ success: false, message: 'Montant invalide' });

    const sender = await User.findById(req.user._id);
    if (sender.wallet.balance < amountNum) {
      return res.status(400).json({ success: false, message: 'Solde insuffisant' });
    }

    const receiver = await User.findOne({ phone: receiverPhone });
    if (!receiver) return res.status(404).json({ success: false, message: 'Destinataire introuvable' });
    if (receiver._id.toString() === sender._id.toString()) {
      return res.status(400).json({ success: false, message: 'Auto-transfert impossible' });
    }

    // Fee calculation (0.5% min 0.1 TND)
    const fee = Math.max(amountNum * 0.005, 0.1);

    // Atomic update
    await User.findByIdAndUpdate(sender._id, { $inc: { 'wallet.balance': -(amountNum + fee) } });
    await User.findByIdAndUpdate(receiver._id, { $inc: { 'wallet.balance': amountNum } });

    const tx = await Transaction.create({
      sender: sender._id,
      receiver: receiver._id,
      type: 'send',
      amount: amountNum,
      fees: fee,
      netAmount: amountNum,
      status: 'completed',
      note,
      category: 'other',
    });

    res.json({ success: true, message: 'Transfert effectué', transaction: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/wallet/topup
exports.topupWallet = async (req, res) => {
  try {
    const { amount, method } = req.body; // method: 'card' | 'bank'
    const amountNum = parseFloat(amount);
    if (amountNum <= 0) return res.status(400).json({ success: false, message: 'Montant invalide' });

    // In production: integrate real payment gateway here
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'wallet.balance': amountNum } });

    const tx = await Transaction.create({
      sender: req.user._id,
      type: 'topup',
      amount: amountNum,
      fees: 0,
      status: 'completed',
      description: `Alimentation via ${method}`,
    });

    res.json({ success: true, message: 'Wallet alimenté', transaction: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/wallet/withdraw
exports.withdrawCash = async (req, res) => {
  try {
    const { amount } = req.body;
    const amountNum = parseFloat(amount);
    const sender = await User.findById(req.user._id);
    if (sender.wallet.balance < amountNum) {
      return res.status(400).json({ success: false, message: 'Solde insuffisant' });
    }
    const withdrawCode = Math.floor(100000 + Math.random() * 900000).toString();
    await User.findByIdAndUpdate(req.user._id, { $inc: { 'wallet.balance': -amountNum } });
    const tx = await Transaction.create({
      sender: req.user._id,
      type: 'withdrawal',
      amount: amountNum,
      fees: 0,
      status: 'completed',
      description: `Retrait DAB - Code: ${withdrawCode}`,
    });
    res.json({ success: true, withdrawCode, transaction: tx, message: 'Utilisez ce code au DAB' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/wallet/transactions
exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const filter = { $or: [{ sender: req.user._id }, { receiver: req.user._id }] };
    if (type) filter.type = type;

    const transactions = await Transaction.find(filter)
      .populate('sender', 'firstName lastName phone avatar')
      .populate('receiver', 'firstName lastName phone avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(filter);
    res.json({ success: true, transactions, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/wallet/savings/deposit
exports.savingsDeposit = async (req, res) => {
  try {
    const { amount } = req.body;
    const amountNum = parseFloat(amount);
    const user = await User.findById(req.user._id);
    if (user.wallet.balance < amountNum) {
      return res.status(400).json({ success: false, message: 'Solde wallet insuffisant' });
    }
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'wallet.balance': -amountNum, 'savingsAccount.balance': amountNum },
      'savingsAccount.isActive': true,
    });
    await Transaction.create({
      sender: req.user._id, type: 'savings_deposit',
      amount: amountNum, fees: 0, status: 'completed',
    });
    res.json({ success: true, message: 'Dépôt épargne effectué' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/wallet/qr-payment
exports.qrPayment = async (req, res) => {
  try {
    const { merchantId, amount, note } = req.body;
    const amountNum = parseFloat(amount);
    const buyer = await User.findById(req.user._id);
    if (buyer.wallet.balance < amountNum) {
      return res.status(400).json({ success: false, message: 'Solde insuffisant' });
    }
    const merchant = await User.findById(merchantId);
    if (!merchant) return res.status(404).json({ success: false, message: 'Commerçant introuvable' });

    await User.findByIdAndUpdate(buyer._id, { $inc: { 'wallet.balance': -amountNum } });
    await User.findByIdAndUpdate(merchant._id, { $inc: { 'wallet.balance': amountNum } });

    const tx = await Transaction.create({
      sender: buyer._id, receiver: merchant._id,
      type: 'qr_payment', amount: amountNum,
      fees: 0, status: 'completed', note,
    });
    res.json({ success: true, message: 'Paiement QR effectué', transaction: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
