const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const Prayer = require('../models/Prayer');
const User = require('../models/User');
const hijri = require('../services/hijri');
const { getTimings } = require('../services/times');
const { getDefs, getEvents } = require('../services/content');
const { validDate, addDays, offsetOf, userNow, toMin, time12, longDate, monthName } = require('../utils/dates');

const { PRAYERS, NAFL, cap, dayPayload, compute } = require('../services/prayers');
const bad = (res, message, status = 400) => res.status(status).json({ message });

const shape = (doc, date) => ({
  date,
  ...Object.fromEntries(PRAYERS.map((p) => [p, (doc && doc[p]) || null])),
  ...Object.fromEntries(NAFL.map((p) => [p, (doc && doc[p]) || null])),
});
const ensureDoc = (user, date) =>
  Prayer.updateOne({ user, date }, { $setOnInsert: { fajr: null, dhuhr: null, asr: null, maghrib: null, isha: null, tahajjud: null } }, { upsert: true })
    .catch((e) => { if (e.code !== 11000) throw e; });

const userOr404 = async (req, res) => {
  const u = await User.findById(req.userId);
  if (!u) res.status(404).json({ message: 'Account not found' });
  return u;
};

/* ---------- reading ---------- */
router.get('/today', auth, safe(async (req, res) => {
  const user = await userOr404(req, res); if (!user) return;
  const [day, c] = await Promise.all([dayPayload(req, user, userNow(req).date), compute(req, user)]);
  res.json({ ...day, streak: c.stats.streak });
}));

router.get('/day/:date', auth, safe(async (req, res) => {
  if (!validDate(req.params.date)) return bad(res, 'Invalid date');
  const user = await userOr404(req, res); if (!user) return;
  res.json(await dayPayload(req, user, req.params.date));
}));

router.get('/month/:ym', auth, safe(async (req, res) => {
  const now = userNow(req);
  const ym = req.params.ym === 'current' ? now.date.slice(0, 7) : req.params.ym;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) return bad(res, 'Invalid month');
  const docs = await Prayer.find({ user: req.userId, date: { $gte: ym + '-01', $lte: ym + '-31' } }).lean();
  const map = Object.fromEntries(docs.map((d) => [d.date, d]));
  const [y, m] = ym.split('-').map(Number);
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = [];
  for (let n = 1; n <= total; n++) {
    const date = `${ym}-${String(n).padStart(2, '0')}`;
    const doc = map[date];
    const count = PRAYERS.filter((p) => doc && doc[p]).length;
    const allOn = PRAYERS.every((p) => doc && doc[p] === 'ontime');
    const future = date > now.date;
    days.push({
      date, day: n, count, today: date === now.date,
      level: future ? 'future' : allOn ? 'full' : count === 5 ? 'made' : count > 0 ? 'part' : 'none',
      missed: !future && date < now.date && count < 5,
      nafl: NAFL.some((k) => doc && doc[k]),
    });
  }
  res.json({
    month: ym, label: monthName(ym), firstWeekday: new Date(Date.UTC(y, m - 1, 1)).getUTCDay(),
    prevMonth: new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7),
    nextMonth: new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7),
    canNext: ym < now.date.slice(0, 7), days,
  });
}));

router.get('/stats', auth, safe(async (req, res) => {
  const user = await userOr404(req, res); if (!user) return;
  res.json((await compute(req, user)).stats);
}));

// /api/prayers/missed?page=1&limit=5  (the last 60 days, paged by the server)
router.get('/missed', auth, safe(async (req, res) => {
  const user = await userOr404(req, res); if (!user) return;
  const { missed } = await compute(req, user);
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 5));
  const pages = Math.max(1, Math.ceil(missed.days.length / limit));
  const page = Math.min(pages, Math.max(1, parseInt(req.query.page, 10) || 1));
  res.json({ total: missed.total, page, pages, limit, days: missed.days.slice((page - 1) * limit, page * limit) });
}));

/* ---------- marking ---------- */
router.post('/:date/mark', auth, safe(async (req, res) => {
  const { date } = req.params;
  const { prayer, status } = req.body;
  if (!validDate(date) || !PRAYERS.includes(prayer) || !['ontime', 'qaza'].includes(status)) return bad(res, 'Invalid request');

  const now = userNow(req);
  if (date > now.date) return bad(res, 'You cannot mark a future day');
  if (status === 'ontime') {
    if (date !== now.date) return bad(res, 'On time can only be marked for today. Use qaza for past days');
    const user = await userOr404(req, res); if (!user) return;
    const t = await getTimings(user, date);
    if (t && t[prayer] && now.minutes < toMin(t[prayer])) return bad(res, `${cap(prayer)} time has not started yet. It starts at ${time12(t[prayer])}`);
  }

  await ensureDoc(req.userId, date);
  // Only succeeds while this prayer is still unmarked, so a locked prayer can never be overwritten.
  const doc = await Prayer.findOneAndUpdate({ user: req.userId, date, [prayer]: null }, { $set: { [prayer]: status } }, { new: true });
  if (!doc) return bad(res, 'This prayer is already marked and cannot be changed', 409);
  res.json(shape(doc, date));
}));

router.post('/:date/undo', auth, safe(async (req, res) => {
  const { date } = req.params;
  const { prayer } = req.body;
  if (!validDate(date) || !PRAYERS.includes(prayer)) return bad(res, 'Invalid request');
  const doc = await Prayer.findOneAndUpdate({ user: req.userId, date, [prayer]: 'qaza' }, { $set: { [prayer]: null } }, { new: true });
  if (!doc) return bad(res, 'Only a qaza mark can be removed. On-time prayers are locked', 409);
  res.json(shape(doc, date));
}));

router.post('/:date/nafl', auth, safe(async (req, res) => {
  const { date } = req.params;
  const { prayer } = req.body;
  if (!validDate(date) || !NAFL.includes(prayer)) return bad(res, 'Invalid request');
  const today = userNow(req).date;
  if (date > today || date < addDays(today, -1)) return bad(res, 'This prayer can be marked for today or yesterday only');
  await ensureDoc(req.userId, date);
  const doc = await Prayer.findOneAndUpdate({ user: req.userId, date, [prayer]: null }, { $set: { [prayer]: 'done' } }, { new: true });
  if (!doc) return bad(res, 'Already marked for this day', 409);
  res.json(shape(doc, date));
}));

module.exports = router;
