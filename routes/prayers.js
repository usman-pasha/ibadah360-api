const router = require('express').Router();
const auth = require('../middleware/auth');
const Prayer = require('../models/Prayer');
const User = require('../models/User');

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const NAFL = ['tahajjud', 'ishraq', 'duha', 'awwabin', 'witr']; // voluntary, locked once marked

/* ---------- helpers ---------- */
// Express 4 does not catch errors in async routes. Without this a database error
// leaves the request hanging and the button seems to do nothing.
const safe = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((e) => {
    console.error(e);
    res.status(500).json({ message: 'Server error. Check the terminal for details' });
  });
const validDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d + 'T00:00:00Z'));
const addDays = (s, n) => {
  const d = new Date(s + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
// The browser sends its timezone offset so "today" is the user's own day.
const offsetOf = (req) => {
  const o = parseInt(req.headers['x-tz-offset'], 10);
  return isNaN(o) ? 0 : o;
};
const userToday = (req) => new Date(Date.now() - offsetOf(req) * 60000).toISOString().slice(0, 10);
const shape = (doc, date) => ({
  date,
  ...Object.fromEntries(PRAYERS.map((p) => [p, (doc && doc[p]) || null])),
  ...Object.fromEntries(NAFL.map((p) => [p, (doc && doc[p]) || null])),
});
const ensureDoc = (user, date) =>
  Prayer.updateOne({ user, date }, { $setOnInsert: { fajr: null, dhuhr: null, asr: null, maghrib: null, isha: null, tahajjud: null } }, { upsert: true }).catch((e) => {
    if (e.code !== 11000) throw e; // ignore a duplicate from a double tap
  });

/* ---------- mark / undo ---------- */
router.post('/:date/mark', auth, safe(async (req, res) => {
  const { date } = req.params;
  const { prayer, status } = req.body;
  if (!validDate(date) || !PRAYERS.includes(prayer) || !['ontime', 'qaza'].includes(status))
    return res.status(400).json({ message: 'Invalid request' });

  const today = userToday(req);
  if (date > today) return res.status(400).json({ message: 'You cannot mark a future day' });
  if (status === 'ontime' && date !== today)
    return res.status(400).json({ message: 'On time can only be marked for today. Use qaza for past days' });

  await ensureDoc(req.userId, date);
  // Only succeeds if this prayer is still unmarked, so a locked prayer can never be overwritten.
  const doc = await Prayer.findOneAndUpdate(
    { user: req.userId, date, [prayer]: null },
    { $set: { [prayer]: status } },
    { new: true }
  );
  if (!doc) return res.status(409).json({ message: 'This prayer is already marked and cannot be changed' });
  res.json(shape(doc, date));
}));

router.post('/:date/undo', auth, safe(async (req, res) => {
  const { date } = req.params;
  const { prayer } = req.body;
  if (!validDate(date) || !PRAYERS.includes(prayer))
    return res.status(400).json({ message: 'Invalid request' });

  // Only qaza can be removed. On-time marks are locked.
  const doc = await Prayer.findOneAndUpdate(
    { user: req.userId, date, [prayer]: 'qaza' },
    { $set: { [prayer]: null } },
    { new: true }
  );
  if (!doc) return res.status(409).json({ message: 'Only a qaza mark can be removed. On-time prayers are locked' });
  res.json(shape(doc, date));
}));

/* ---------- voluntary prayers (locked once marked) ---------- */
router.post('/:date/nafl', auth, safe(async (req, res) => {
  const { date } = req.params;
  const { prayer } = req.body;
  if (!validDate(date) || !NAFL.includes(prayer)) return res.status(400).json({ message: 'Invalid request' });
  const today = userToday(req);
  if (date > today || date < addDays(today, -1))
    return res.status(400).json({ message: 'This prayer can be marked for today or yesterday only' });
  await ensureDoc(req.userId, date);
  const doc = await Prayer.findOneAndUpdate(
    { user: req.userId, date, [prayer]: null },
    { $set: { [prayer]: 'done' } },
    { new: true }
  );
  if (!doc) return res.status(409).json({ message: 'Already marked for this day' });
  res.json(shape(doc, date));
}));

/* ---------- calendar month ---------- */
router.get('/month/:ym', auth, safe(async (req, res) => {
  const { ym } = req.params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) return res.status(400).json({ message: 'Invalid month' });
  const docs = await Prayer.find({ user: req.userId, date: { $gte: ym + '-01', $lte: ym + '-31' } });
  res.json(docs.map((d) => shape(d, d.date)));
}));

/* ---------- stats + missed list ---------- */
async function compute(req) {
  const today = userToday(req);
  const user = await User.findById(req.userId).select('createdAt');
  const joined = new Date(user.createdAt.getTime() - offsetOf(req) * 60000).toISOString().slice(0, 10);
  const docs = await Prayer.find({ user: req.userId }).lean();
  const map = Object.fromEntries(docs.map((d) => [d.date, d]));

  let start = docs.reduce((min, d) => (d.date < min ? d.date : min), joined);
  if (start < addDays(today, -3650)) start = addDays(today, -3650);

  const windowStart = addDays(today, -59);
  const d30 = addDays(today, -29);
  const s = { ontime: 0, qaza: 0, missed: 0, streak: 0, best: 0, last30: 0, days30: 0, tahajjud: 0, nafl: 0 };
  const missedBy = Object.fromEntries(PRAYERS.map((p) => [p, 0]));
  const days = [];
  let run = 0;
  let tRun = 0;

  for (let d = start; d <= today; d = addDays(d, 1)) {
    const doc = map[d];
    const lost = [];
    PRAYERS.forEach((p) => {
      const st = doc && doc[p];
      if (st === 'ontime') { s.ontime++; if (d >= d30 && d < today) s.last30++; }
      else if (st === 'qaza') s.qaza++;
      else if (d < today) { s.missed++; missedBy[p]++; lost.push(p); }
    });
    if (d >= d30 && d < today) s.days30++;
    if (lost.length && d >= windowStart) days.unshift({ date: d, prayers: lost });

    if (doc) NAFL.forEach((k) => { if (doc[k]) s.nafl++; });
    if (doc && doc.tahajjud) { s.tahajjud++; tRun++; } else if (d < today) tRun = 0;
    const full = doc && PRAYERS.every((p) => doc[p] === 'ontime');
    if (d === today) { if (full) run++; } else run = full ? run + 1 : 0;
    s.best = Math.max(s.best, run);
  }
  s.streak = run;

  return {
    stats: {
      tahajjud: s.tahajjud, nafl: s.nafl, tahajjudStreak: tRun, streak: s.streak, best: s.best, ontime: s.ontime, qaza: s.qaza, missed: s.missed,
      percent: s.days30 ? Math.round((s.last30 / (s.days30 * 5)) * 100) : null,
      missedBy,
    },
    missed: { total: s.missed, days },
  };
}

router.get('/stats', auth, safe(async (req, res) => res.json((await compute(req)).stats)));
router.get('/missed', auth, safe(async (req, res) => res.json((await compute(req)).missed)));

/* ---------- one day (keep last) ---------- */
router.get('/:date', auth, safe(async (req, res) => {
  const { date } = req.params;
  if (!validDate(date)) return res.status(400).json({ message: 'Invalid date' });
  res.json(shape(await Prayer.findOne({ user: req.userId, date }), date));
}));

module.exports = router;
