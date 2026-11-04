const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const Prayer = require('../models/Prayer');
const User = require('../models/User');
const hijri = require('../services/hijri');
const { getTimings } = require('../services/times');
const { getDefs, getEvents } = require('../services/content');
const { validDate, addDays, offsetOf, userNow, toMin, time12, longDate, monthName } = require('../utils/dates');

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const NAFL = ['tahajjud', 'ishraq', 'duha', 'awwabin', 'witr']; // voluntary, locked once marked
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const bad = (res, message, status = 400) => res.status(status).json({ message });

const shape = (doc, date) => ({
  date,
  ...Object.fromEntries(PRAYERS.map((p) => [p, (doc && doc[p]) || null])),
  ...Object.fromEntries(NAFL.map((p) => [p, (doc && doc[p]) || null])),
});
const ensureDoc = (user, date) =>
  Prayer.updateOne({ user, date }, { $setOnInsert: { fajr: null, dhuhr: null, asr: null, maghrib: null, isha: null, tahajjud: null } }, { upsert: true })
    .catch((e) => { if (e.code !== 11000) throw e; });

/* ---------- one day, with every rule already applied ---------- */
async function dayPayload(req, user, date) {
  const now = userNow(req);
  const isToday = date === now.date;
  const future = date > now.date;
  const [doc, defs, t, events] = await Promise.all([
    Prayer.findOne({ user: user._id, date }).lean(),
    getDefs(),
    isToday ? getTimings(user, date) : null,
    getEvents(),
  ]);

  const prayers = defs.fard.map((d) => {
    const status = (doc && doc[d.key]) || null;
    const startsAt = t && t[d.key] ? t[d.key] : null;
    const waiting = !status && isToday && !!startsAt && now.minutes < toMin(startsAt);
    let actions = [];
    if (!future) {
      if (status === 'qaza') actions = ['undo'];
      else if (!status && !waiting) actions = isToday ? ['ontime', 'qaza'] : ['qaza'];
    }
    return { key: d.key, name: d.name, ar: d.ar, status, startsAt, startsLabel: startsAt ? time12(startsAt) : null, waiting, actions };
  });
  const yesterday = addDays(now.date, -1);
  const nafl = defs.nafl.map((d) => {
    const done = !!(doc && doc[d.key]);
    return { key: d.key, name: d.name, ar: d.ar, tip: d.tip, done, canMark: !done && (date === now.date || date === yesterday) };
  });

  let h = { text: '', events: [], eid: false };
  if (hijri.supported) {
    const info = hijri.dayInfo(date, user.hijriAdj, hijri.eventMap(events));
    h = { text: info.hijri.text, events: info.events.map((e) => e.name), eid: info.eid };
  }
  return { date, label: longDate(date), isToday, future, hijri: h, prayers, nafl, done: prayers.filter((p) => p.status).length, total: prayers.length };
}

/* ---------- stats and missed prayers ---------- */
async function compute(req, user) {
  const today = userNow(req).date;
  const joined = new Date(user.createdAt.getTime() - offsetOf(req) * 60000).toISOString().slice(0, 10);
  const docs = await Prayer.find({ user: user._id }).lean();
  const map = Object.fromEntries(docs.map((d) => [d.date, d]));
  const defs = await getDefs();
  const nameOf = Object.fromEntries(defs.fard.map((d) => [d.key, d.name]));

  let start = docs.reduce((min, d) => (d.date < min ? d.date : min), joined);
  if (start < addDays(today, -3650)) start = addDays(today, -3650);
  const windowStart = addDays(today, -59);
  const d30 = addDays(today, -29);
  const s = { ontime: 0, qaza: 0, missed: 0, best: 0, last30: 0, days30: 0, tahajjud: 0, nafl: 0 };
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
    if (lost.length && d >= windowStart) days.unshift({ date: d, label: longDate(d), prayers: lost.map((k) => ({ key: k, name: nameOf[k] || cap(k) })) });
    if (doc) NAFL.forEach((k) => { if (doc[k]) s.nafl++; });
    if (doc && doc.tahajjud) { s.tahajjud++; tRun++; } else if (d < today) tRun = 0;
    const full = doc && PRAYERS.every((p) => doc[p] === 'ontime');
    if (d === today) { if (full) run++; } else run = full ? run + 1 : 0;
    s.best = Math.max(s.best, run);
  }
  const percent = s.days30 ? Math.round((s.last30 / (s.days30 * 5)) * 100) : null;
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  return {
    stats: {
      streak: run, best: s.best, ontime: s.ontime, qaza: s.qaza, missed: s.missed, percent, nafl: s.nafl, tahajjud: s.tahajjud, tahajjudStreak: tRun,
      rows: [
        { label: 'Current streak (all 5 on time)', value: plural(run, 'day') },
        { label: 'Best streak', value: plural(s.best, 'day') },
        { label: 'Prayed on time', value: String(s.ontime) },
        { label: 'Made up as qaza', value: String(s.qaza) },
        { label: 'Still missed', value: String(s.missed) },
        { label: 'On time, last 30 days', value: percent === null ? '–' : percent + '%' },
        { label: 'Extra prayers (nafl) marked', value: String(s.nafl) },
        { label: 'Tahajjud nights', value: String(s.tahajjud) },
        { label: 'Tahajjud streak', value: plural(tRun, 'night') },
      ],
      missedBy: PRAYERS.map((p) => ({ key: p, name: nameOf[p] || cap(p), count: missedBy[p] })),
    },
    missed: { total: s.missed, days },
  };
}

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
