// src/middleware/validate.js
const { body, param, query, validationResult } = require('express-validator');

// Helper: run validation and return 422 on error
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Données invalides',
      errors: errors.array().map(e => ({ field: e.path, msg: e.msg })),
    });
  }
  next();
};

// ── Auth validators ────────────────────────────────────────────────
exports.registerValidator = [
  body('firstName').trim().notEmpty().withMessage('Prénom requis').isLength({ max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Nom requis').isLength({ max: 50 }),
  body('phone').trim().notEmpty().withMessage('Téléphone requis')
    .matches(/^[0-9+\s-]{8,15}$/).withMessage('Numéro invalide'),
  body('email').trim().isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe: 6 caractères minimum'),
  validate,
];

exports.loginValidator = [
  body('email').trim().isEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
  validate,
];

// ── Wallet validators ──────────────────────────────────────────────
exports.sendMoneyValidator = [
  body('receiverPhone').trim().notEmpty().withMessage('Numéro destinataire requis')
    .matches(/^[0-9+\s-]{8,15}$/).withMessage('Numéro invalide'),
  body('amount').isFloat({ min: 0.001, max: 10000 }).withMessage('Montant invalide (0.001 – 10 000 TND)'),
  body('note').optional().trim().isLength({ max: 200 }),
  validate,
];

exports.topupValidator = [
  body('amount').isFloat({ min: 1, max: 50000 }).withMessage('Montant invalide'),
  body('method').isIn(['card', 'bank']).withMessage('Méthode invalide'),
  validate,
];

exports.withdrawValidator = [
  body('amount').isFloat({ min: 10, max: 5000 }).withMessage('Montant: 10 – 5 000 TND'),
  validate,
];

exports.savingsDepositValidator = [
  body('amount').isFloat({ min: 1 }).withMessage('Montant minimum: 1 TND'),
  validate,
];

// ── Bills validators ───────────────────────────────────────────────
exports.billPayValidator = [
  body('billType').notEmpty().withMessage('Type de facture requis')
    .isIn(['STEG', 'SONEDE', 'TOPNET', 'OOREDOO_INTERNET', 'ORANGE_INTERNET', 'TT_INTERNET', 'CNS', 'CUSTOMS'])
    .withMessage('Fournisseur invalide'),
  body('reference').trim().notEmpty().withMessage('Référence facture requise'),
  body('amount').isFloat({ min: 0.001 }).withMessage('Montant invalide'),
  validate,
];

// ── Recharge validators ────────────────────────────────────────────
exports.rechargeValidator = [
  body('phone').trim().notEmpty().withMessage('Numéro requis')
    .matches(/^[0-9]{8}$/).withMessage('Numéro tunisien invalide (8 chiffres)'),
  body('operator').isIn(['Ooredoo', 'Orange', 'Tunisie_Telecom']).withMessage('Opérateur invalide'),
  body('amount').isFloat().withMessage('Montant invalide')
    .custom(v => [1, 2, 3, 5, 7, 10, 15, 20, 30, 50].includes(Number(v)))
    .withMessage('Montant non disponible'),
  validate,
];

// ── AI validators ──────────────────────────────────────────────────
exports.aiChatValidator = [
  body('message').trim().notEmpty().withMessage('Message requis')
    .isLength({ min: 1, max: 1000 }).withMessage('Message trop long (max 1000 caractères)'),
  validate,
];

// ── Admin validators ───────────────────────────────────────────────
exports.kycValidator = [
  body('kycStatus').isIn(['pending', 'verified', 'rejected']).withMessage('Statut KYC invalide'),
  validate,
];

exports.mongoIdParam = [
  param('id').isMongoId().withMessage('ID invalide'),
  validate,
];
