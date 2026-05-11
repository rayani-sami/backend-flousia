const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Identity
  firstName:    { type: String, required: true, trim: true },
  lastName:     { type: String, required: true, trim: true },
  phone:        { type: String, required: true, unique: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  password:     { type: String, required: true, minlength: 6 },
  cin:          { type: String, sparse: true },
  avatar:       { type: String, default: null },

  // Role
  role:         { type: String, enum: ['user', 'admin'], default: 'user' },
  isVerified:   { type: Boolean, default: false },
  isBlocked:    { type: Boolean, default: false },
  kycStatus:    { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },

  // Wallet
  wallet: {
    balance:      { type: Number, default: 0, min: 0 },
    currency:     { type: String, default: 'TND' },
    cardVirtual:  { type: String, default: null }, // masked card number
    cardPhysical: { type: String, default: null },
    iban:         { type: String, default: null },
  },

  // Savings Account
  savingsAccount: {
    balance:     { type: Number, default: 0 },
    interestRate:{ type: Number, default: 7 }, // 7% annual
    isActive:    { type: Boolean, default: false },
  },

  // AI Budget Settings
  monthlyBudget:  { type: Number, default: 0 },
  savingsGoal:    { type: Number, default: 0 },
  financialProfile: {
    riskTolerance:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    monthlyIncome:    { type: Number, default: 0 },
    primaryGoal:      { type: String, default: 'save' },
  },

  // AI Chat History (last 50 messages)
  aiChatHistory: [{
    role:      { type: String, enum: ['user', 'assistant'] },
    content:   String,
    timestamp: { type: Date, default: Date.now },
  }],

  // Notifications
  fcmToken:     { type: String, default: null },

}, { timestamps: true });

// Hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Virtual: full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);
