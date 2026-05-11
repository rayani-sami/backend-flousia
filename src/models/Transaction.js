const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // Parties
  sender:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  
  // Transaction Info
  type: {
    type: String,
    enum: [
      'send',           // Envoi wallet → wallet
      'receive',        // Réception
      'recharge_phone', // Recharge téléphonique
      'bill_payment',   // Paiement facture (STEG, SONEDE)
      'bank_transfer',  // Virement bancaire
      'topup',          // Alimentation wallet
      'withdrawal',     // Retrait DAB
      'qr_payment',     // Paiement QR commerçant
      'savings_deposit',// Dépôt épargne
      'savings_withdraw',// Retrait épargne
      'donation',       // Don
    ],
    required: true,
  },
  
  amount:      { type: Number, required: true, min: 0.001 },
  currency:    { type: String, default: 'TND' },
  fees:        { type: Number, default: 0 },
  netAmount:   { type: Number },        // amount - fees
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  },
  
  // Meta
  reference:   { type: String, unique: true },  // TX_UUID
  description: { type: String, default: '' },
  note:        { type: String, default: '' },   // note personnelle
  qrData:      { type: String, default: null }, // pour paiement QR
  
  // Bill / Recharge details
  billRef:     { type: String, default: null }, // référence facture
  phoneNumber: { type: String, default: null }, // numéro rechargé
  operator:    { type: String, default: null }, // Ooredoo, Orange, TT
  
  // AI Category (auto-tagged)
  category: {
    type: String,
    enum: ['food', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'education', 'savings', 'other'],
    default: 'other',
  },
  aiTagged:    { type: Boolean, default: false },

}, { timestamps: true });

// Generate reference before save
transactionSchema.pre('save', function (next) {
  if (!this.reference) {
    this.reference = 'TX-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  if (!this.netAmount) {
    this.netAmount = this.amount - (this.fees || 0);
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
