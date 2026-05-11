// src/controllers/merchantController.js
const Merchant = require('../models/Merchant');
const Product  = require('../models/Product');

// ─── GET /api/merchants/nearby ────────────────────────────────────────────────
// Query: lat, lng, radius(m), category, limit
exports.getNearby = async (req, res) => {
  try {
    const { lat, lng, radius = 50000, category, limit = 30 } = req.query;

    if (!lat || !lng) {
      // Fallback: return all active merchants paginated
      const merchants = await Merchant.find({ isActive: true })
        .sort({ isFeatured: -1, rating: -1 })
        .limit(parseInt(limit));
      return res.json({ success: true, merchants, total: merchants.length, geolocation: false });
    }

    const query = {
      isActive: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius),
        },
      },
    };
    if (category && category !== 'all') query.category = category;

    const merchants = await Merchant.find(query).limit(parseInt(limit));

    // Attach distance (approx) in km
    const withDist = merchants.map(m => {
      const [mLng, mLat] = m.location.coordinates;
      const R = 6371;
      const dLat = ((mLat - parseFloat(lat)) * Math.PI) / 180;
      const dLon = ((mLng - parseFloat(lng)) * Math.PI) / 180;
      const a = Math.sin(dLat/2)**2 +
        Math.cos(parseFloat(lat)*Math.PI/180) * Math.cos(mLat*Math.PI/180) *
        Math.sin(dLon/2)**2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return { ...m.toObject(), distanceKm: Math.round(dist * 10) / 10 };
    });

    res.json({ success: true, merchants: withDist, total: withDist.length, geolocation: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/merchants/search ────────────────────────────────────────────────
exports.search = async (req, res) => {
  try {
    const { q, category, gouvernorat, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };
    if (category && category !== 'all') filter.category = category;
    if (gouvernorat) filter.gouvernorat = gouvernorat;
    if (q) {
      filter.$or = [
        { name:    { $regex: q, $options: 'i' } },
        { nameAr:  { $regex: q, $options: 'i' } },
        { tags:    { $regex: q, $options: 'i' } },
        { ville:   { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } },
      ];
    }
    const merchants = await Merchant.find(filter)
      .sort({ isFeatured: -1, rating: -1 })
      .skip((page-1)*limit).limit(parseInt(limit));
    const total = await Merchant.countDocuments(filter);
    res.json({ success: true, merchants, total, pages: Math.ceil(total/limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/merchants/featured ──────────────────────────────────────────────
exports.getFeatured = async (req, res) => {
  try {
    const featured = await Merchant.find({ isActive: true, isFeatured: true })
      .sort({ rating: -1 }).limit(10);
    res.json({ success: true, merchants: featured });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/merchants/categories ────────────────────────────────────────────
exports.getCategories = (req, res) => {
  res.json({
    success: true,
    categories: [
      { id: 'all',          labelFr: 'Tout',           labelAr: 'الكل',      labelDarija: 'الكل',        icon: 'apps' },
      { id: 'restaurant',   labelFr: 'Restaurant',     labelAr: 'مطعم',      labelDarija: 'ماكلة',       icon: 'restaurant' },
      { id: 'magasin',      labelFr: 'Magasin',        labelAr: 'مغازة',     labelDarija: 'ماڨازان',     icon: 'shopping_bag' },
      { id: 'hanout',       labelFr: 'Hanout',         labelAr: 'حانوت',     labelDarija: 'حانوت',       icon: 'storefront' },
      { id: 'pharmacie',    labelFr: 'Pharmacie',      labelAr: 'صيدلية',    labelDarija: 'فارماسيان',   icon: 'local_pharmacy' },
      { id: 'supermarche',  labelFr: 'Supermarché',    labelAr: 'سوبرماركت', labelDarija: 'سوبرماركي',   icon: 'local_grocery_store' },
      { id: 'cafe',         labelFr: 'Café',           labelAr: 'مقهى',      labelDarija: 'قهوة',        icon: 'local_cafe' },
      { id: 'boulangerie',  labelFr: 'Boulangerie',    labelAr: 'مخبزة',     labelDarija: 'خبازة',       icon: 'bakery_dining' },
      { id: 'electronique', labelFr: 'Électronique',   labelAr: 'إلكترونيات',labelDarija: 'الكترونيك',   icon: 'devices' },
      { id: 'vetements',    labelFr: 'Vêtements',      labelAr: 'ملابس',     labelDarija: 'حوايج',       icon: 'checkroom' },
      { id: 'services',     labelFr: 'Services',       labelAr: 'خدمات',     labelDarija: 'خدمات',       icon: 'miscellaneous_services' },
    ],
  });
};

// ─── GET /api/merchants/:id ────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.params.id);
    if (!merchant) return res.status(404).json({ success: false, message: 'Marchand introuvable' });
    await Merchant.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } });
    const products = await Product.find({ merchant: merchant._id, isActive: true }).limit(20);
    res.json({ success: true, merchant, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/merchants/:id/products ──────────────────────────────────────────
exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, category } = req.query;
    const filter = { merchant: req.params.id, isActive: true };
    if (category) filter.category = category;
    const products = await Product.find(filter)
      .sort({ isFeatured: -1, salesCount: -1 })
      .skip((page-1)*limit).limit(parseInt(limit));
    const total = await Product.countDocuments(filter);
    res.json({ success: true, products, total, pages: Math.ceil(total/limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Admin: POST /api/admin/merchants ─────────────────────────────────────────
exports.adminCreate = async (req, res) => {
  try {
    const { lat, lng, ...rest } = req.body;
    const merchant = await Merchant.create({
      ...rest,
      location: lat && lng ? {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
      } : undefined,
    });
    res.status(201).json({ success: true, merchant });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── Admin: PUT /api/admin/merchants/:id ──────────────────────────────────────
exports.adminUpdate = async (req, res) => {
  try {
    const { lat, lng, ...rest } = req.body;
    const update = { ...rest };
    if (lat && lng) update.location = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] };
    const merchant = await Merchant.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, merchant });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── Admin: DELETE /api/admin/merchants/:id ───────────────────────────────────
exports.adminDelete = async (req, res) => {
  try {
    await Merchant.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Marchand désactivé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Admin: POST /api/admin/merchants/:id/products ────────────────────────────
exports.adminAddProduct = async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, merchant: req.params.id });
    await Merchant.findByIdAndUpdate(req.params.id, { $inc: { productsCount: 1 } });
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── Admin: GET /api/admin/merchants ──────────────────────────────────────────
exports.adminGetAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, isVerified } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { ville: { $regex: search, $options: 'i' } },
    ];
    if (category)   filter.category   = category;
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
    const merchants = await Merchant.find(filter)
      .sort({ createdAt: -1 })
      .skip((page-1)*limit).limit(parseInt(limit));
    const total = await Merchant.countDocuments(filter);
    const stats = await Merchant.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    res.json({ success: true, merchants, total, pages: Math.ceil(total/limit), stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
