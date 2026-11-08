const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const Dhikr = require('../models/Dhikr');
const State = require('../models/TasbihState');
const Day = require('../models/TasbihDay');
const { userNow, addDays, at } = require('../utils/dates');

const bad = (res, message) => res.status(400).json({ message });

async function view(req) {
  const today = userNow(req).date;
  const [dhikrs, state, rows] = await Promise.all([
    Dhikr.find().sort({ order: 1 }).select('-__v').lean(),
    State.findOne({ user: req.userId }).lean(),
    Day.find({ user: req.userId }).lean(),
  ]);
  const st = state || { key: dhikrs[0] ? dhikrs[0].key : 'subhanallah', count: 0, target: dhikrs[0] ? dhikrs[0].target : 33, rounds: 0 };
  const nameOf = Object.fromEntries(dhikrs.map((d) => [d.key, d.tr]));
  const byDay = {};
  rows.forEach((r) => { byDay[r.date] = (byDay[r.date] || 0) + r.count; });
  const week = [];
  for (let i = 6; i >= 0; i--) { const d = addDays(today, -i); week.push({ date: d, label: at(d).toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }), count: byDay[d] || 0, today: i === 0 }); }
  return {
    dhikrs, current: { key: st.key, count: st.count, target: st.target, rounds: st.rounds },
    today: { total: byDay[today] || 0, byDhikr: rows.filter((r) => r.date === today).map((r) => ({ key: r.key, name: nameOf[r.key] || r.key, count: r.count })) },
    week, lifetime: rows.reduce((n, r) => n + r.count, 0),
  };
}

router.get('/', auth, safe(async (req, res) => res.json(await view(req))));

// Add taps. When the count reaches the target a round is finished and the count starts again.
router.post('/count', auth, safe(async (req, res) => {
  const add = Number(req.body.add);
  if (!Number.isInteger(add) || add < 1 || add > 500) return bad(res, 'Add between 1 and 500 at a time');
  const dhikrs = await Dhikr.find().sort({ order: 1 }).lean();
  let st = await State.findOne({ user: req.userId });
  if (!st) st = { user: req.userId, key: dhikrs[0].key, count: 0, target: dhikrs[0].target, rounds: 0 };
  const total = st.count + add;
  const set = { count: total % st.target, rounds: st.rounds + Math.floor(total / st.target) };
  await State.findOneAndUpdate({ user: req.userId }, { $set: { key: st.key, target: st.target, ...set } }, { upsert: true, setDefaultsOnInsert: true });
  await Day.updateOne({ user: req.userId, date: userNow(req).date, key: st.key }, { $inc: { count: add } }, { upsert: true });
  res.json(await view(req));
}));

// Choose a dhikr and an optional target of your own
router.put('/select', auth, safe(async (req, res) => {
  const d = await Dhikr.findOne({ key: String(req.body.key) }).lean();
  if (!d) return bad(res, 'Unknown dhikr');
  let target = d.target;
  if (req.body.target !== undefined) { target = Number(req.body.target); if (!Number.isInteger(target) || target < 1 || target > 100000) return bad(res, 'Target must be 1 to 100000'); }
  await State.findOneAndUpdate({ user: req.userId }, { $set: { key: d.key, target, count: 0, rounds: 0 } }, { upsert: true, setDefaultsOnInsert: true });
  res.json(await view(req));
}));

router.post('/reset', auth, safe(async (req, res) => {
  await State.findOneAndUpdate({ user: req.userId }, { $set: { count: 0, rounds: 0 } }, { upsert: true, setDefaultsOnInsert: true });
  res.json(await view(req));
}));

module.exports = router;
