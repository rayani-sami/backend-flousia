const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

// @POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password } = req.body;
    if (await User.findOne({ $or: [{ email }, { phone }] })) {
      return res.status(400).json({ success: false, message: 'Email ou téléphone déjà utilisé' });
    }
    const user = await User.create({ firstName, lastName, phone, email, password });
    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: sanitize(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Compte bloqué' });
    }

    res.json({ success: true, token: generateToken(user._id), user: sanitize(user) });
  } catch (err) {
    console.error('LOGIN ERROR:', err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @GET /api/auth/me
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -aiChatHistory');
  res.json({ success: true, user: sanitize(user) });
};

// @PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, monthlyBudget, savingsGoal, financialProfile } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName, monthlyBudget, savingsGoal, financialProfile },
      { new: true }
    ).select('-password');
    res.json({ success: true, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @POST /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(oldPassword))) {
      return res.status(400).json({ success: false, message: 'Ancien mot de passe incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Mot de passe mis à jour' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const sanitize = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
  kycStatus: user.kycStatus,
  wallet: user.wallet,
  savingsAccount: user.savingsAccount,
  monthlyBudget: user.monthlyBudget,
  savingsGoal: user.savingsGoal,
  financialProfile: user.financialProfile,
  avatar: user.avatar,
  createdAt: user.createdAt,
});
