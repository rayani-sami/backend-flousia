// src/routes/taxRoutes.js
const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const t = require('../controllers/taxController');

// Simulations (no payment)
router.get('/simulate/vignette', protect, t.simulateVignette);
router.get('/simulate/amende',   protect, t.simulateAmende);
router.get('/rates',             protect, t.getRates);

// Payments
router.post('/vignette',    protect, t.payVignette);
router.post('/fonciere',    protect, t.payTaxeFonciere);
router.post('/amende',      protect, t.payAmende);
router.post('/universite',  protect, t.payFraisUniversite);
router.post('/cnam',        protect, t.payCNAM);

// History
router.get('/history',      protect, t.getTaxHistory);

// Admin
router.get('/admin/all',    protect, adminOnly, t.adminGetTaxes);

module.exports = router;
