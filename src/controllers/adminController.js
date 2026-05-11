const User = require('../models/User');
const Transaction = require('../models/Transaction');

// @GET /api/admin/stats
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalUsers,
      newUsersThisMonth,
      totalTransactions,
      txThisMonth,
      pendingKYC,
      blockedUsers,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', createdAt: { $gte: startOfMonth } }),
      Transaction.countDocuments({ status: 'completed' }),
      Transaction.countDocuments({ status: 'completed', createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ kycStatus: 'pending' }),
      User.countDocuments({ isBlocked: true }),
    ]);

    const volumeAgg = await Transaction.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' }, fees: { $sum: '$fees' } } },
    ]);

    const lastMonthVolume = await Transaction.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startOfLastMonth, $lt: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Monthly user growth (last 6 months)
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
      { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Transaction type breakdown
    const txByType = await Transaction.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: '$type', count: { $sum: 1 }, volume: { $sum: '$amount' } } },
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers, newUsersThisMonth, totalTransactions, txThisMonth,
        pendingKYC, blockedUsers,
        volumeThisMonth: volumeAgg[0]?.total || 0,
        feesThisMonth: volumeAgg[0]?.fees || 0,
        lastMonthVolume: lastMonthVolume[0]?.total || 0,
        userGrowth, txByType,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, kycStatus } = req.query;
    const filter = { role: 'user' };
    if (search) filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
    if (status === 'blocked') filter.isBlocked = true;
    if (status === 'active') filter.isBlocked = false;
    if (kycStatus) filter.kycStatus = kycStatus;

    const users = await User.find(filter)
      .select('-password -aiChatHistory')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);
    res.json({ success: true, users, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/admin/users/:id/block
exports.toggleBlock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({ success: true, message: user.isBlocked ? 'Compte bloqué' : 'Compte débloqué', isBlocked: user.isBlocked });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @PUT /api/admin/users/:id/kyc
exports.updateKYC = async (req, res) => {
  try {
    const { kycStatus } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { kycStatus, isVerified: kycStatus === 'verified' },
      { new: true }
    ).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/admin/transactions
exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, search } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) filter.reference = { $regex: search, $options: 'i' };

    const transactions = await Transaction.find(filter)
      .populate('sender', 'firstName lastName phone')
      .populate('receiver', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(filter);
    res.json({ success: true, transactions, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/admin/users/:id
exports.getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -aiChatHistory');
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    const txCount = await Transaction.countDocuments({ $or: [{ sender: user._id }, { receiver: user._id }] });
    const txVolume = await Transaction.aggregate([
      { $match: { sender: user._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    res.json({ success: true, user, txCount, txVolume: txVolume[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
