const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { billPayValidator } = require('../middleware/validate');
const { payBill, getBillOperators } = require('../controllers/billController');

router.get('/types', protect, getBillOperators);
router.post('/pay',  protect, billPayValidator, payBill);

module.exports = router;
