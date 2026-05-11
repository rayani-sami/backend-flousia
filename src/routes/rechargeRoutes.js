const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { rechargeValidator } = require('../middleware/validate');
const { rechargePhone, getOperators } = require('../controllers/rechargeController');

router.get('/',           protect, getOperators);
router.post('/',          protect, rechargeValidator, rechargePhone);

module.exports = router;
