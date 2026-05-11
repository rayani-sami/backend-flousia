const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');
router.use(protect);
router.get('/:id', async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id)
      .populate('sender', 'firstName lastName phone')
      .populate('receiver', 'firstName lastName phone');
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction introuvable' });
    res.json({ success: true, transaction: tx });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
module.exports = router;
