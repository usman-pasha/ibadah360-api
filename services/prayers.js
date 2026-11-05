// Prayer rules and numbers, used by the prayer routes, the dashboard and the progress report.
const Prayer = require('../models/Prayer');
const hijri = require('./hijri');
const { getTimings } = require('./times');
const { getDefs, getEvents } = require('./content');
const { addDays, offsetOf, userNow, toMin, time12, longDate } = require('../utils/dates');

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const NAFL = ['tahajjud', 'ishraq', 'duha', 'awwabin', 'witr']; // voluntary, locked once marked
const cap = (s) => s[0].toUpperCase() + s.slice(1);

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


module.exports = { PRAYERS, NAFL, cap, dayPayload, compute };
