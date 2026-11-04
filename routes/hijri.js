const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const User = require('../models/User');
const hijri = require('../services/hijri');
const { getEvents } = require('../services/content');
const { userNow } = require('../utils/dates');

async function context(req, res) {
  if (!hijri.supported) {
    res.status(503).json({ message: 'This server cannot work out Islamic dates. Please use Node.js 18 or newer.' });
    return null;
  }
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ message: 'Account not found' }); return null; }
  return { today: userNow(req).date, adj: user.hijriAdj, evMap: hijri.eventMap(await getEvents()) };
}

router.get('/today', auth, safe(async (req, res) => {
  const c = await context(req, res); if (!c) return;
  res.json(hijri.dayInfo(c.today, c.adj, c.evMap));
}));

// offset = months from the current Hijri month (0 now, -1 last month, 1 next month)
router.get('/month', auth, safe(async (req, res) => {
  const c = await context(req, res); if (!c) return;
  const offset = parseInt(req.query.offset, 10) || 0;
  res.json(hijri.month(c.today, c.adj, offset, c.evMap));
}));

router.get('/upcoming', auth, safe(async (req, res) => {
  const c = await context(req, res); if (!c) return;
  const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 8));
  res.json(hijri.upcoming(c.today, c.adj, c.evMap, limit));
}));

module.exports = router;
