// src/models/TaxPayment.js
const mongoose = require('mongoose');

const taxPaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Type de taxe
  taxType: {
    type: String,
    enum: [
      'vignette',       // Taxe voiture (vignette automobile)
      'taxe_fonciere',  // Taxe foncière / municipale
      'amende',         // Amende routière
      'frais_univ',     // Frais universitaires / CNCS
      'cnam',           // Paiement CNAM (assurance maladie)
    ],
    required: true,
  },

  // Montant
  amount:    { type: Number, required: true, min: 0 },
  fees:      { type: Number, default: 0 },
  currency:  { type: String, default: 'TND' },

  // Statut
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed',
  },

  // Référence unique
  reference: { type: String, unique: true },

  // ── Vignette automobile ──────────────────────────────
  vignette: {
    matricule:    String,   // Immatriculation ex: "123 TUN 4567"
    typeVehicule: String,   // 'tourisme' | 'moto' | 'camion' | 'utilitaire'
    cylindree:    Number,   // en cm³ (1600, 2000, …)
    annee:        Number,   // Année du véhicule
    anneeVignette:Number,   // Année pour laquelle on paie (2025, 2026…)
    gouvernorat:  String,
  },

  // ── Taxe foncière ────────────────────────────────────
  fonciere: {
    refCadastre:  String,   // Référence cadastrale
    adresse:      String,
    typeImmeuble: String,   // 'habitation' | 'commercial' | 'terrain'
    gouvernorat:  String,
    annee:        Number,
  },

  // ── Amende routière ──────────────────────────────────
  amende: {
    numPV:        String,   // Numéro du procès-verbal
    dateInfraction: Date,
    typeInfraction: String, // 'excès_vitesse' | 'stationnement' | 'feu_rouge' | 'autre'
    lieu:         String,
    matricule:    String,
    majoration:   Number,   // Majorations éventuelles
  },

  // ── Frais universitaires / CNCS ──────────────────────
  universite: {
    numeroEtudiant: String,
    etablissement:  String, // 'ISET' | 'FST' | 'ENSI' | ...
    anneeUniv:      String, // '2024/2025'
    typesFrais:     String, // 'inscription' | 'examen' | 'diplome' | 'cncs'
    filiere:        String,
  },

  // ── CNAM ─────────────────────────────────────────────
  cnam: {
    numeroCnam:   String,   // Numéro affilié CNAM
    typeAssurance:String,   // 'maladie' | 'maternite' | 'invalidite'
    periode:      String,   // 'T1-2025' | 'T2-2025' …
    cin:          String,
  },

  // Reçu / quittance
  receiptNumber: String,
  receiptUrl:    String,
  notes:         String,

}, { timestamps: true });

// Génération automatique de référence
taxPaymentSchema.pre('save', function (next) {
  if (!this.reference) {
    const prefix = { vignette: 'VIG', taxe_fonciere: 'FON', amende: 'AMD', frais_univ: 'UNIV', cnam: 'CNAM' };
    const p   = prefix[this.taxType] || 'TAX';
    const ts  = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).substr(2, 5).toUpperCase();
    this.reference = `${p}-${ts}-${rnd}`;
  }
  next();
});

module.exports = mongoose.model('TaxPayment', taxPaymentSchema);
