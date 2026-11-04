const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const Dua = require('../models/Dua');
const { userNow, dayNumber } = require('../utils/dates');

// Search and pages are done by the database: /api/duas?search=sleep&page=1&limit=5
router.get('/', auth, safe(async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 5));
  const term = String(req.query.search || '').trim().slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = term ? { $or: ['title', 'en', 'tr', 'cat'].map((f) => ({ [f]: { $regex: term, $options: 'i' } })) } : {};
  const total = await Dua.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(pages, Math.max(1, parseInt(req.query.page, 10) || 1));
  const duas = await Dua.find(filter).sort({ order: 1 }).skip((page - 1) * limit).limit(limit).select('-__v').lean();
  res.json({ total, page, pages, limit, duas });
}));

router.get('/today', auth, safe(async (req, res) => {
  const total = await Dua.countDocuments();
  if (!total) return res.status(404).json({ message: 'No duas saved yet. Run: npm run seed' });
  const dua = await Dua.findOne().sort({ order: 1 }).skip(dayNumber(userNow(req).date) % total).select('-__v').lean();
  res.json(dua);
}));

module.exports = router;
