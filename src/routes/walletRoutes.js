const express = require('express');
const router = express.Router();
const w = require('../controllers/walletController');
const { protect } = require('../middleware/auth');
const {
  sendMoneyValidator, topupValidator, withdrawValidator, savingsDepositValidator,
} = require('../middleware/validate');

router.use(protect);
router.get('/balance',          w.getBalance);
router.post('/send',            sendMoneyValidator,      w.sendMoney);
router.post('/topup',           topupValidator,          w.topupWallet);
router.post('/withdraw',        withdrawValidator,       w.withdrawCash);
router.get('/transactions',     w.getTransactions);
router.post('/savings/deposit', savingsDepositValidator, w.savingsDeposit);
router.post('/qr-payment',      w.qrPayment);
module.exports = router;
