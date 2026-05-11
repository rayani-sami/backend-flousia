// src/utils/helpers.js

/**
 * Format a number as TND currency string.
 * @param {number} amount
 * @returns {string}  e.g. "1 234.500 TND"
 */
exports.formatTND = (amount) => {
  return new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount) + ' TND';
};

/**
 * Calculate fee for a wallet-to-wallet transfer.
 * Rule: 0.5% of amount, minimum 0.1 TND, maximum 5 TND.
 * @param {number} amount
 * @returns {number}
 */
exports.calcTransferFee = (amount) => {
  const pct = amount * 0.005;
  return Math.min(Math.max(pct, 0.1), 5);
};

/**
 * Generate a unique transaction reference.
 * Format: TX-{timestamp}-{random6}
 * @returns {string}
 */
exports.generateTxRef = () => {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `TX-${ts}-${rnd}`;
};

/**
 * Generate a 6-digit DAB withdrawal code.
 * @returns {string}
 */
exports.generateWithdrawCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/**
 * Mask a card number for display.
 * @param {string} card  "1234567812345678"
 * @returns {string}     "**** **** **** 5678"
 */
exports.maskCard = (card) => {
  if (!card || card.length < 4) return '****';
  return `**** **** **** ${card.slice(-4)}`;
};

/**
 * Paginate a Mongoose query.
 * @param {Model}  model
 * @param {Object} filter
 * @param {Object} opts   { page, limit, sort, populate }
 * @returns {{ data, total, pages, page }}
 */
exports.paginate = async (model, filter = {}, opts = {}) => {
  const page  = Math.max(parseInt(opts.page)  || 1, 1);
  const limit = Math.min(parseInt(opts.limit) || 20, 100);
  const sort  = opts.sort || { createdAt: -1 };

  let q = model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit);
  if (opts.populate) {
    const pops = Array.isArray(opts.populate) ? opts.populate : [opts.populate];
    pops.forEach(p => { q = q.populate(p); });
  }

  const [data, total] = await Promise.all([q, model.countDocuments(filter)]);
  return { data, total, pages: Math.ceil(total / limit), page };
};

/**
 * Safe JSON parse — returns defaultValue on error.
 * @param {string} str
 * @param {*}      defaultValue
 */
exports.safeJsonParse = (str, defaultValue = null) => {
  try { return JSON.parse(str); } catch (_) { return defaultValue; }
};

/**
 * Return the first day of the current month as a Date.
 */
exports.startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

/**
 * Return the first day of the previous month.
 */
exports.startOfLastMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
};

/**
 * Clamp a numeric value between min and max.
 */
exports.clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Sleep for ms milliseconds (useful in tests / scripts).
 */
exports.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Validate a Tunisian phone number (8 digits, starting with 2, 5, 7, 9).
 * @param {string} phone
 * @returns {boolean}
 */
exports.isTunisianPhone = (phone) => /^[2579][0-9]{7}$/.test(phone.replace(/\s+/g, ''));

/**
 * Return month name in French.
 * @param {number} month  0-indexed
 */
exports.monthNameFr = (month) => {
  const names = ['Janvier','Février','Mars','Avril','Mai','Juin',
                 'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return names[month] ?? '';
};
