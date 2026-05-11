// create_admin.js
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./src/models/User');

  const existing = await User.findOne({ email: 'admin@floucia.tn' });
  if (existing) {
    console.log('⚠️ Admin déjà existant:', existing.email);
    process.exit(0);
  }

  const admin = await User.create({
    firstName: 'Admin',
    lastName: 'FloucIA',
    phone: '+21612345678',
    email: 'admin@floucia.tn',
    password: 'Admin@123',
    role: 'admin',
    isVerified: true,
    isBlocked: false,
    kycStatus: 'verified',
    wallet: { balance: 1500, currency: 'TND' },
    savingsAccount: { balance: 5000, interestRate: 7, isActive: true },
    monthlyBudget: 2000,
    savingsGoal: 10000,
    financialProfile: { riskTolerance: 'medium', monthlyIncome: 4000, primaryGoal: 'invest' },
  });

  console.log('✅ Admin créé avec succès !');
  console.log('📧 Email    :', admin.email);
  console.log('🔑 Password : Admin@123');
  console.log('👤 Role     :', admin.role);
  console.log('🆔 ID       :', admin._id);
  process.exit(0);
}).catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});