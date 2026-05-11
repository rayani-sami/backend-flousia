// src/models/Merchant.js
const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema({
  // Owner (optional link to User)
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Identity — multilingual
  name: { type: String, required: true, trim: true },
  nameAr: { type: String, trim: true },   // Arabic name
  nameDarija: { type: String, trim: true }, // Darija name

  description:       { type: String, default: '' },
  descriptionAr:     { type: String, default: '' },
  descriptionDarija: { type: String, default: '' },

  // Category
  category: {
    type: String,
    enum: ['restaurant', 'magasin', 'hanout', 'pharmacie', 'supermarche',
           'cafe', 'boulangerie', 'electronique', 'vetements', 'services',
           'sante', 'education', 'transport', 'autre'],
    default: 'magasin',
  },

  // Sub-tags
  tags: [String], // e.g. ['pizza', 'livraison', 'halal']

  // Location — GeoJSON Point for $near queries
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
  },
  address:     { type: String, default: '' },
  addressAr:   { type: String, default: '' },
  gouvernorat: { type: String, default: '' },
  ville:       { type: String, default: '' },

  // Contact
  phone:    { type: String, default: '' },
  phone2:   { type: String, default: '' },
  email:    { type: String, default: '' },
  website:  { type: String, default: '' },
  whatsapp: { type: String, default: '' },

  // Media
  logo:    { type: String, default: null },
  cover:   { type: String, default: null },
  images:  [String],

  // Hours
  openingHours: {
    lundi:    { open: String, close: String, closed: { type: Boolean, default: false } },
    mardi:    { open: String, close: String, closed: { type: Boolean, default: false } },
    mercredi: { open: String, close: String, closed: { type: Boolean, default: false } },
    jeudi:    { open: String, close: String, closed: { type: Boolean, default: false } },
    vendredi: { open: String, close: String, closed: { type: Boolean, default: false } },
    samedi:   { open: String, close: String, closed: { type: Boolean, default: false } },
    dimanche: { open: String, close: String, closed: { type: Boolean, default: true  } },
  },

  // Flouci Pay integration
  acceptsFloucIA:  { type: Boolean, default: true },
  merchantQrCode:  { type: String, default: null },
  commissionRate:  { type: Number, default: 1.5 }, // %

  // Stats
  rating:       { type: Number, default: 0, min: 0, max: 5 },
  reviewsCount: { type: Number, default: 0 },
  viewsCount:   { type: Number, default: 0 },

  // Status
  isActive:   { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },

  // Products (embedded minimal, full in Product model)
  productsCount: { type: Number, default: 0 },

}, { timestamps: true });

// Geospatial index for $near queries
merchantSchema.index({ location: '2dsphere' });
merchantSchema.index({ category: 1, isActive: 1 });
merchantSchema.index({ name: 'text', nameAr: 'text', tags: 'text' });

module.exports = mongoose.model('Merchant', merchantSchema);
