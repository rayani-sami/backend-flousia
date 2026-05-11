const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { aiChatValidator } = require('../middleware/validate');
const { chat, getFinancialAnalysis, getDailyTips, clearHistory } = require('../controllers/aiController');

router.post('/chat',      protect, aiChatValidator, chat);
router.get('/analysis',   protect, getFinancialAnalysis);
router.get('/tips',       protect, getDailyTips);
router.delete('/history', protect, clearHistory);

module.exports = router;
