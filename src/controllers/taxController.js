// src/controllers/taxController.js
const User       = require('../models/User');
const TaxPayment = require('../models/TaxPayment');
const Transaction = require('../models/Transaction');

// ─── Barèmes tunisiens (approximatifs 2025) ───────────────────────────────────

const VIGNETTE_RATES = {
  tourisme: [
    { max: 1000,  price: 30  },
    { max: 1300,  price: 60  },
    { max: 1600,  price: 100 },
    { max: 2000,  price: 170 },
    { max: 2500,  price: 250 },
    { max: 3000,  price: 350 },
    { max: Infinity, price: 500 },
  ],
  moto:       [{ max: 250, price: 20 }, { max: 500, price: 40 }, { max: Infinity, price: 80 }],
  utilitaire: [{ max: Infinity, price: 150 }],
  camion:     [{ max: Infinity, price: 400 }],
};

const AMENDE_RATES = {
  excès_vitesse:  { base: 100, majoration_30j: 50  },
  stationnement:  { base: 30,  majoration_30j: 15  },
  feu_rouge:      { base: 150, majoration_30j: 75  },
  portable:       { base: 80,  majoration_30j: 40  },
  ceinture:       { base: 50,  majoration_30j: 25  },
  autre:          { base: 60,  majoration_30j: 30  },
};

const FRAIS_UNIV_RATES = {
  inscription: 50,
  examen:      30,
  diplome:     80,
  cncs:        40,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calcVignette = (typeVehicule, cylindree) => {
  const rates = VIGNETTE_RATES[typeVehicule] || VIGNETTE_RATES.tourisme;
  const bracket = rates.find(r => cylindree <= r.max);
  return bracket ? bracket.price : rates[rates.length - 1].price;
};

const calcAmende = (typeInfraction, daysLate = 0) => {
  const r = AMENDE_RATES[typeInfraction] || AMENDE_RATES.autre;
  return r.base + (daysLate > 30 ? r.majoration_30j : 0);
};

const debitWallet = async (userId, amount, fees = 0) => {
  const total = amount + fees;
  const user  = await User.findById(userId);
  if (!user || user.wallet.balance < total) throw new Error('Solde wallet insuffisant');
  await User.findByIdAndUpdate(userId, { $inc: { 'wallet.balance': -total } });
  return total;
};

// ─── GET /api/taxes/simulate/vignette ─────────────────────────────────────────
exports.simulateVignette = (req, res) => {
  const { typeVehicule = 'tourisme', cylindree = 1600 } = req.query;
  const price = calcVignette(typeVehicule, parseInt(cylindree));
  res.json({
    success: true,
    simulation: {
      typeVehicule, cylindree: parseInt(cylindree),
      montant: price, currency: 'TND',
      detail: `Vignette ${new Date().getFullYear()} — ${typeVehicule} ${cylindree}cm³`,
    },
  });
};

// ─── POST /api/taxes/vignette ──────────────────────────────────────────────────
exports.payVignette = async (req, res) => {
  try {
    const { matricule, typeVehicule = 'tourisme', cylindree, annee, gouvernorat, anneeVignette } = req.body;
    if (!matricule || !cylindree) return res.status(400).json({ success: false, message: 'Matricule et cylindrée requis' });

    const cyl    = parseInt(cylindree);
    const amount = calcVignette(typeVehicule, cyl);
    const fees   = 1.5; // frais de service FloucIA

    await debitWallet(req.user._id, amount, fees);

    const tax = await TaxPayment.create({
      user: req.user._id,
      taxType: 'vignette',
      amount, fees, status: 'completed',
      vignette: { matricule, typeVehicule, cylindree: cyl, annee, gouvernorat, anneeVignette: anneeVignette || new Date().getFullYear() },
      receiptNumber: `VIG-${Date.now()}`,
      notes: `Vignette ${anneeVignette || new Date().getFullYear()} pour ${matricule}`,
    });

    // Enregistrer aussi dans Transaction pour l'historique unifié
    await Transaction.create({
      sender: req.user._id, type: 'bill_payment',
      amount, fees, status: 'completed',
      description: `Vignette auto ${anneeVignette || new Date().getFullYear()} — ${matricule}`,
      category: 'bills',
    });

    res.json({ success: true, message: `Vignette payée pour ${matricule}`, taxPayment: tax });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── POST /api/taxes/fonciere ─────────────────────────────────────────────────
exports.payTaxeFonciere = async (req, res) => {
  try {
    const { refCadastre, adresse, typeImmeuble = 'habitation', gouvernorat, annee, amount } = req.body;
    if (!refCadastre || !amount) return res.status(400).json({ success: false, message: 'Référence cadastrale et montant requis' });

    const amountNum = parseFloat(amount);
    const fees      = Math.max(amountNum * 0.005, 1);

    await debitWallet(req.user._id, amountNum, fees);

    const tax = await TaxPayment.create({
      user: req.user._id,
      taxType: 'taxe_fonciere',
      amount: amountNum, fees, status: 'completed',
      fonciere: { refCadastre, adresse, typeImmeuble, gouvernorat, annee: annee || new Date().getFullYear() },
      receiptNumber: `FON-${Date.now()}`,
      notes: `Taxe foncière ${annee || new Date().getFullYear()} — Réf: ${refCadastre}`,
    });

    await Transaction.create({
      sender: req.user._id, type: 'bill_payment',
      amount: amountNum, fees, status: 'completed',
      description: `Taxe foncière — ${refCadastre}`,
      category: 'bills',
    });

    res.json({ success: true, message: 'Taxe foncière payée', taxPayment: tax });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── GET /api/taxes/simulate/amende ──────────────────────────────────────────
exports.simulateAmende = (req, res) => {
  const { typeInfraction = 'autre', dateInfraction } = req.query;
  const daysLate = dateInfraction
    ? Math.floor((Date.now() - new Date(dateInfraction)) / 86400000)
    : 0;
  const amount   = calcAmende(typeInfraction, daysLate);
  const majore   = daysLate > 30;
  res.json({
    success: true,
    simulation: { typeInfraction, montant: amount, majore, daysLate, currency: 'TND' },
  });
};

// ─── POST /api/taxes/amende ───────────────────────────────────────────────────
exports.payAmende = async (req, res) => {
  try {
    const { numPV, typeInfraction = 'autre', dateInfraction, lieu, matricule } = req.body;
    if (!numPV) return res.status(400).json({ success: false, message: 'Numéro PV requis' });

    const daysLate  = dateInfraction ? Math.floor((Date.now() - new Date(dateInfraction)) / 86400000) : 0;
    const amount    = calcAmende(typeInfraction, daysLate);
    const majoration = daysLate > 30 ? AMENDE_RATES[typeInfraction]?.majoration_30j || 0 : 0;
    const fees      = 1;

    await debitWallet(req.user._id, amount, fees);

    const tax = await TaxPayment.create({
      user: req.user._id,
      taxType: 'amende',
      amount, fees, status: 'completed',
      amende: { numPV, dateInfraction: dateInfraction ? new Date(dateInfraction) : null, typeInfraction, lieu, matricule, majoration },
      receiptNumber: `AMD-${Date.now()}`,
      notes: `Amende PV ${numPV} — ${typeInfraction}`,
    });

    await Transaction.create({
      sender: req.user._id, type: 'bill_payment',
      amount, fees, status: 'completed',
      description: `Amende routière PV ${numPV}`,
      category: 'bills',
    });

    res.json({ success: true, message: `Amende PV ${numPV} payée`, taxPayment: tax, majoration });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── POST /api/taxes/universite ───────────────────────────────────────────────
exports.payFraisUniversite = async (req, res) => {
  try {
    const { numeroEtudiant, etablissement, anneeUniv, typesFrais = 'inscription', filiere } = req.body;
    if (!numeroEtudiant || !etablissement) return res.status(400).json({ success: false, message: 'Numéro étudiant et établissement requis' });

    const amount = FRAIS_UNIV_RATES[typesFrais] || 50;
    const fees   = 0;

    await debitWallet(req.user._id, amount, fees);

    const tax = await TaxPayment.create({
      user: req.user._id,
      taxType: 'frais_univ',
      amount, fees, status: 'completed',
      universite: { numeroEtudiant, etablissement, anneeUniv: anneeUniv || '2024/2025', typesFrais, filiere },
      receiptNumber: `UNIV-${Date.now()}`,
      notes: `${typesFrais} — ${etablissement} ${anneeUniv || '2024/2025'}`,
    });

    await Transaction.create({
      sender: req.user._id, type: 'bill_payment',
      amount, fees, status: 'completed',
      description: `Frais ${typesFrais} — ${etablissement}`,
      category: 'education',
    });

    res.json({ success: true, message: 'Frais universitaires payés', taxPayment: tax });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── POST /api/taxes/cnam ─────────────────────────────────────────────────────
exports.payCNAM = async (req, res) => {
  try {
    const { numeroCnam, typeAssurance = 'maladie', periode, cin, amount } = req.body;
    if (!numeroCnam || !amount) return res.status(400).json({ success: false, message: 'Numéro CNAM et montant requis' });

    const amountNum = parseFloat(amount);
    const fees      = 0;

    await debitWallet(req.user._id, amountNum, fees);

    const tax = await TaxPayment.create({
      user: req.user._id,
      taxType: 'cnam',
      amount: amountNum, fees, status: 'completed',
      cnam: { numeroCnam, typeAssurance, periode: periode || `T${Math.ceil((new Date().getMonth()+1)/3)}-${new Date().getFullYear()}`, cin },
      receiptNumber: `CNAM-${Date.now()}`,
      notes: `CNAM ${typeAssurance} — ${numeroCnam}`,
    });

    await Transaction.create({
      sender: req.user._id, type: 'bill_payment',
      amount: amountNum, fees, status: 'completed',
      description: `Cotisation CNAM ${typeAssurance} — ${numeroCnam}`,
      category: 'health',
    });

    res.json({ success: true, message: 'Cotisation CNAM payée', taxPayment: tax });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── GET /api/taxes/history ───────────────────────────────────────────────────
exports.getTaxHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, taxType } = req.query;
    const filter = { user: req.user._id };
    if (taxType) filter.taxType = taxType;

    const taxes = await TaxPayment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await TaxPayment.countDocuments(filter);
    res.json({ success: true, taxes, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/taxes/rates ─────────────────────────────────────────────────────
exports.getRates = (req, res) => {
  res.json({
    success: true,
    rates: {
      vignette: VIGNETTE_RATES,
      amende:   AMENDE_RATES,
      fraisUniv: FRAIS_UNIV_RATES,
    },
    vignetteTypes: ['tourisme', 'moto', 'utilitaire', 'camion'],
    amendeTypes:   Object.keys(AMENDE_RATES),
    fraisTypes:    Object.keys(FRAIS_UNIV_RATES),
    gouvernorats: [
      'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
      'Bizerte', 'Béja', 'Jendouba', 'Kef', 'Siliana', 'Sousse',
      'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
      'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
    ],
    etablissements: ['ISET', 'FST', 'FSEG', 'ENSI', 'INSAT', 'ENIM', 'Médecine', 'Droit', 'Lettres', 'Autre'],
  });
};

// ─── Admin: GET /api/admin/taxes ──────────────────────────────────────────────
exports.adminGetTaxes = async (req, res) => {
  try {
    const { page = 1, limit = 20, taxType, status } = req.query;
    const filter = {};
    if (taxType) filter.taxType = taxType;
    if (status)  filter.status  = status;

    const taxes = await TaxPayment.find(filter)
      .populate('user', 'firstName lastName phone email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total   = await TaxPayment.countDocuments(filter);
    const volume  = await TaxPayment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$taxType', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    res.json({ success: true, taxes, total, pages: Math.ceil(total / limit), volume });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
