require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();

// Connect DB
connectDB();

// Security Middleware
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate Limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// Routes
app.use('/api/auth',        require('./routes/authRoutes'));
app.use('/api/wallet',      require('./routes/walletRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/ai',          require('./routes/aiRoutes'));
app.use('/api/admin',       require('./routes/adminRoutes'));
app.use('/api/bills',       require('./routes/billRoutes'));
app.use('/api/recharge',    require('./routes/rechargeRoutes'));
app.use('/api/merchants',   require('./routes/merchantRoutes'));
app.use('/api/taxes',       require('./routes/taxRoutes'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'FloucIA API running ✅', version: '1.0.0' }));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 FloucIA Server running on port ${PORT}`));
