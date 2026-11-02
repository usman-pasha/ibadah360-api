const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { cleanPhone } = require('../utils/validate');

const shape = (u) => ({
  name: u.name, email: u.email, phone: u.phone || '', createdAt: u.createdAt,
  settings: { city: u.city, state: u.state, madhab: u.madhab, method: u.method, hijriAdj: u.hijriAdj },
});
const fail = (res, e) => { console.error(e); res.status(500).json({ message: 'Server error. Try again' }); };
const placeOk = (s, min) => s.length >= min && s.length <= 60 && /^[\p{L}\s.'-]+$/u.test(s);

router.get('/', auth, async (req, res) => {
  try {
    const u = await User.findById(req.userId);
    if (!u) return res.status(404).json({ message: 'Account not found' });
    res.json(shape(u));
  } catch (e) { fail(res, e); }
});

// Full name and mobile number
router.put('/', auth, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const phone = cleanPhone(req.body.phone);
    if (name.length < 2 || name.length > 60) return res.status(400).json({ message: 'Full name must be 2 to 60 characters' });
    if (phone === null) return res.status(400).json({ message: 'Enter a valid Indian mobile number (10 digits starting with 6 to 9)' });
    const u = await User.findByIdAndUpdate(req.userId, { name, phone }, { new: true });
    if (!u) return res.status(404).json({ message: 'Account not found' });
    res.json(shape(u));
  } catch (e) { fail(res, e); }
});

// Namaz time settings (city, madhab, method) and moon sighting adjustment
router.put('/settings', auth, async (req, res) => {
  try {
    const city = String(req.body.city || '').trim();
    const state = String(req.body.state || '').trim();
    const madhab = String(req.body.madhab);
    const method = String(req.body.method);
    const hijriAdj = Number(req.body.hijriAdj);
    if (!placeOk(city, 2)) return res.status(400).json({ message: 'Enter a valid city name' });
    if (state && !placeOk(state, 2)) return res.status(400).json({ message: 'Enter a valid state name' });
    if (!['hanafi', 'shafi'].includes(madhab)) return res.status(400).json({ message: 'Choose Hanafi or Shafi' });
    if (!['1', '3'].includes(method)) return res.status(400).json({ message: 'Choose a calculation method' });
    if (![-2, -1, 0, 1, 2].includes(hijriAdj)) return res.status(400).json({ message: 'Invalid moon sighting setting' });
    const u = await User.findByIdAndUpdate(req.userId, { city, state, madhab, method, hijriAdj }, { new: true });
    if (!u) return res.status(404).json({ message: 'Account not found' });
    res.json(shape(u));
  } catch (e) { fail(res, e); }
});

router.post('/password', auth, async (req, res) => {
  try {
    const current = String(req.body.current || '');
    const next = String(req.body.next || '');
    if (next.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });
    const u = await User.findById(req.userId);
    if (!u || !(await bcrypt.compare(current, u.password)))
      return res.status(400).json({ message: 'Current password is wrong' });
    u.password = await bcrypt.hash(next, 10);
    await u.save();
    res.json({ message: 'Password changed' });
  } catch (e) { fail(res, e); }
});

module.exports = router;
