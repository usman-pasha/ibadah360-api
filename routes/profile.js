const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const User = require('../models/User');
const Follow = require('../models/Follow');
const S = require('../services/social');
const { cleanPhone } = require('../utils/validate');
const { MADHABS, METHODS, HIJRI_ADJUSTMENTS } = require('../config/options');
const { BIO_MAX } = require('../config/social');

const shape = async (u) => ({
  name: u.name, email: u.email, phone: u.phone || '', username: u.username, bio: u.bio || '', isPrivate: !!u.isPrivate, createdAt: u.createdAt,
  settings: { city: u.city, state: u.state, madhab: u.madhab, method: u.method, hijriAdj: u.hijriAdj },
  social: await S.counts(u._id),
});
const placeOk = (s, min) => s.length >= min && s.length <= 60 && /^[\p{L}\s.'-]+$/u.test(s);
const allowed = (list, v) => list.some((o) => String(o.value) === String(v));
const bad = (res, message, status = 400) => res.status(status).json({ message });
const notFound = (res) => res.status(404).json({ message: 'Account not found' });

router.get('/', auth, safe(async (req, res) => {
  const u = await User.findById(req.userId);
  if (!u) return notFound(res);
  res.json(await shape(u));
}));

// Full name, mobile, username, bio
router.put('/', auth, safe(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = cleanPhone(req.body.phone);
  if (name.length < 2 || name.length > 60) return bad(res, 'Full name must be 2 to 60 characters');
  if (phone === null) return bad(res, 'Enter a valid Indian mobile number (10 digits starting with 6 to 9)');
  const update = { name, phone };

  if (req.body.username !== undefined) {
    const username = String(req.body.username).trim().toLowerCase();
    const err = S.usernameError(username);
    if (err) return bad(res, err);
    if (await User.findOne({ username, _id: { $ne: req.userId } })) return bad(res, 'This username is already taken', 409);
    update.username = username;
  }
  if (req.body.bio !== undefined) {
    const bio = String(req.body.bio).trim();
    if (bio.length > BIO_MAX) return bad(res, `Bio can be up to ${BIO_MAX} characters`);
    update.bio = bio;
  }
  let u;
  try { u = await User.findByIdAndUpdate(req.userId, update, { new: true }); }
  catch (e) { if (e.code === 11000) return bad(res, 'This username is already taken', 409); throw e; }
  if (!u) return notFound(res);
  res.json(await shape(u));
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
  res.json({ ...(await shape(u)), accepted });
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
  res.json(await shape(u));
}));

router.post('/password', auth, safe(async (req, res) => {
  const current = String(req.body.current || '');
  const next = String(req.body.next || '');
  if (next.length < 6) return bad(res, 'New password must be at least 6 characters');
  const u = await User.findById(req.userId);
  if (!u || !(await bcrypt.compare(current, u.password))) return bad(res, 'Current password is wrong');
  u.password = await bcrypt.hash(next, 10);
  await u.save();
  res.json({ message: 'Password changed' });
}));

module.exports = router;
