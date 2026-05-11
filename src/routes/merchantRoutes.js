// src/routes/merchantRoutes.js
const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const m = require('../controllers/merchantController');

// Public / authenticated
router.get('/nearby',      protect, m.getNearby);
router.get('/search',      protect, m.search);
router.get('/featured',    protect, m.getFeatured);
router.get('/categories',  protect, m.getCategories);
router.get('/:id',         protect, m.getById);
router.get('/:id/products',protect, m.getProducts);

// Admin
router.post('/',            protect, adminOnly, m.adminCreate);
router.put('/:id',          protect, adminOnly, m.adminUpdate);
router.delete('/:id',       protect, adminOnly, m.adminDelete);
router.post('/:id/products',protect, adminOnly, m.adminAddProduct);
router.get('/admin/all',    protect, adminOnly, m.adminGetAll);

module.exports = router;
