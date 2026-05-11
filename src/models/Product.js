// src/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },

  // Name multilingual
  name:       { type: String, required: true },
  nameAr:     { type: String, default: '' },
  nameDarija: { type: String, default: '' },

  description:       { type: String, default: '' },
  descriptionAr:     { type: String, default: '' },

  category:  { type: String, default: 'autre' },
  tags:      [String],

  price:         { type: Number, required: true, min: 0 },
  priceOld:      { type: Number, default: null },   // for discounts
  currency:      { type: String, default: 'TND' },
  discountPct:   { type: Number, default: 0 },

  images:       [String],
  thumbnail:    { type: String, default: null },

  inStock:      { type: Boolean, default: true },
  stockQty:     { type: Number, default: null },

  isActive:     { type: Boolean, default: true },
  isFeatured:   { type: Boolean, default: false },

  rating:       { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  salesCount:   { type: Number, default: 0 },

}, { timestamps: true });

productSchema.index({ merchant: 1, isActive: 1 });
productSchema.index({ name: 'text', nameAr: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
