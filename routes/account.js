// ACCOUNT = private details and settings that only the owner sees.
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { cleanPhone } = require('../utils/validate');
const { MADHABS, METHODS, HIJRI_ADJUSTMENTS } = require('../config/options');

const shape = (u) => ({
  email: u.email, phone: u.phone || '', hasPassword: !!u.password, google: !!u.googleId, isPrivate: !!u.isPrivate, createdAt: u.createdAt,
  settings: { city: u.city, state: u.state, madhab: u.madhab, method: u.method, hijriAdj: u.hijriAdj },
});
const placeOk = (s, min) => s.length >= min && s.length <= 60 && /^[\p{L}\s.'-]+$/u.test(s);
const allowed = (list, v) => list.some((o) => String(o.value) === String(v));
const bad = (res, message) => res.status(400).json({ message });
const notFound = (res) => res.status(404).json({ message: 'Account not found' });

router.get('/', auth, safe(async (req, res) => {
  const u = await User.findById(req.userId);
  if (!u) return notFound(res);
  res.json(shape(u));
}));

// Mobile number
router.put('/', auth, safe(async (req, res) => {
  const phone = cleanPhone(req.body.phone);
  if (phone === null) return bad(res, 'Enter a valid Indian mobile number (10 digits starting with 6 to 9)');
  const u = await User.findByIdAndUpdate(req.userId, { phone }, { new: true });
  if (!u) return notFound(res);
  res.json(shape(u));
}));

// Public or private account. Going public accepts every waiting follow request, like Instagram.
router.put('/privacy', auth, safe(async (req, res) => {
  if (typeof req.body.isPrivate !== 'boolean') return bad(res, 'Choose private or public');
  const u = await User.findByIdAndUpdate(req.userId, { isPrivate: req.body.isPrivate }, { new: true });
  if (!u) return notFound(res);
  let accepted = 0;
  if (!req.body.isPrivate) {
    const r = await Follow.updateMany({ following: u._id, status: 'pending' }, { $set: { status: 'accepted' } });
    accepted = r.modifiedCount || 0;
  }
  res.json({ ...shape(u), accepted });
}));

router.put('/settings', auth, safe(async (req, res) => {
  const city = String(req.body.city || '').trim();
  const state = String(req.body.state || '').trim();
  const { madhab, method, hijriAdj } = req.body;
  if (!placeOk(city, 2)) return bad(res, 'Enter a valid city name');
  if (state && !placeOk(state, 2)) return bad(res, 'Enter a valid state name');
  if (!allowed(MADHABS, madhab)) return bad(res, 'Choose a madhab');
  if (!allowed(METHODS, method)) return bad(res, 'Choose a calculation method');
  if (!allowed(HIJRI_ADJUSTMENTS, hijriAdj)) return bad(res, 'Choose a moon sighting setting');
  const u = await User.findByIdAndUpdate(req.userId, { city, state, madhab: String(madhab), method: String(method), hijriAdj: Number(hijriAdj) }, { new: true });
  if (!u) return notFound(res);
  res.json(shape(u));
}));

router.post('/password', auth, safe(async (req, res) => {
  const current = String(req.body.current || '');
  const next = String(req.body.next || '');
  if (next.length < 6) return bad(res, 'New password must be at least 6 characters');
  const u = await User.findById(req.userId);
  if (!u) return notFound(res);
  // A Google account that never had a password can set one without a current password
  if (u.password && !(await bcrypt.compare(current, u.password))) return bad(res, 'Current password is wrong');
  u.password = await bcrypt.hash(next, 10);
  await u.save();
  res.json({ message: 'Password changed' });
}));

module.exports = router;
