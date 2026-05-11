const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { kycValidator, mongoIdParam } = require('../middleware/validate');
const {
  getDashboardStats, getUsers, getUserDetail,
  toggleBlock, updateKYC, getTransactions,
} = require('../controllers/adminController');
const a = require('../controllers/adminController');
router.use(protect, adminOnly);

router.get('/stats',a.getDashboardStats);
router.get('/users',a.getUsers);
router.get('/users/:id',mongoIdParam,a.getUserDetail);
router.put('/users/:id/block', mongoIdParam, a.toggleBlock);
router.put('/users/:id/kyc',mongoIdParam, kycValidator, a.updateKYC);
router.get('/transactions',a.getTransactions);

module.exports = router;
