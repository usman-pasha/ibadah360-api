// The home screen in one request: today's prayers, next prayer, week, Quran, learning, people, next Islamic date.
const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const User = require('../models/User');
const Prayer = require('../models/Prayer');
const hijri = require('../services/hijri');
const S = require('../services/social');
const learn = require('../services/learn');
const readlog = require('../services/readlog');
const { dayPayload, compute, PRAYERS } = require('../services/prayers');
const { timesView } = require('../services/times');
const { getEvents } = require('../services/content');
const { addDays, userNow, at } = require('../utils/dates');

router.get('/', auth, safe(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'Account not found' });
  const now = userNow(req);
  const [day, c, tv, events, rs, prog, lp, soc, weekDocs] = await Promise.all([
    dayPayload(req, user, now.date),
    compute(req, user),
    timesView(user, now).catch(() => null),
    getEvents(),
    readlog.readStats(user._id),
    readlog.progressView(user._id),
    learn.summary(user._id),
    S.counts(user._id),
    Prayer.find({ user: user._id, date: { $gte: addDays(now.date, -6), $lte: now.date } }).lean(),
  ]);

  const byDate = Object.fromEntries(weekDocs.map((d) => [d.date, d]));
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDays(now.date, -i);
    week.push({ date, label: at(date).toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }), count: PRAYERS.filter((p) => byDate[date] && byDate[date][p]).length, today: i === 0 });
  }
  const up = hijri.supported ? hijri.upcoming(now.date, user.hijriAdj, hijri.eventMap(events), 1)[0] : null;

  res.json({
    name: user.name, date: day.label, hijri: day.hijri,
    prayers: { done: day.done, total: day.total, streak: c.stats.streak, missed: c.stats.missed, next: tv && tv.available ? tv.next : null },
    week,
    quran: { started: prog.started, label: prog.started ? prog.label : null, mode: prog.mode, percent: rs.percent, ayahsRead: rs.totalRead, ayahs: rs.totalAyahs, parasDone: rs.parasDone },
    learning: lp,
    social: soc,
    upcoming: up ? { name: up.name, inLabel: up.inLabel, dateLabel: up.dateLabel, hijriText: up.hijriText, eid: up.eid } : null,
  });
}));

module.exports = router;
