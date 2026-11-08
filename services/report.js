// The complete progress report: prayers, Quran reading and learning, for a chosen period.
const Prayer = require('../models/Prayer');
const ReadingDay = require('../models/ReadingDay');
const prayers = require('./prayers');
const readlog = require('./readlog');
const learn = require('./learn');
const S = require('./social');
const { getDefs } = require('./content');
const { addDays, userNow, offsetOf, at } = require('../utils/dates');

const RANGES = { week: { days: 7, label: 'Last 7 days' }, month: { days: 30, label: 'Last 30 days' }, year: { days: 365, label: 'Last 12 months' }, all: { days: null, label: 'All time' } };
const dayLabel = (d) => at(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthLabel = (m) => at(m + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// per day for up to 31 days, otherwise per month
function bucket(days, valueOf, maxOf) {
  if (days.length <= 31) return { unit: 'day', bars: days.map((d) => ({ label: dayLabel(d), ...valueOf(d), max: maxOf(1) })) };
  const months = {};
  days.forEach((d) => { (months[d.slice(0, 7)] = months[d.slice(0, 7)] || []).push(d); });
  return { unit: 'month', bars: Object.entries(months).map(([m, ds]) => {
    const parts = ds.map(valueOf);
    return { label: monthLabel(m), value: parts.reduce((n, p) => n + p.value, 0), ontime: parts.reduce((n, p) => n + (p.ontime || 0), 0), max: maxOf(ds.length) };
  }) };
}

// On time and prayed percentages for the last 8 weeks and the last 12 months
function trends(map, first, today) {
  const stat = (d) => {
    const doc = map[d]; let o = 0; let q = 0; let m = 0;
    prayers.PRAYERS.forEach((p) => { const st = doc && doc[p]; if (st === 'ontime') o++; else if (st === 'qaza') q++; else if (d < today) m++; });
    return { o, q, m };
  };
  const agg = (ds) => {
    let o = 0; let q = 0; let m = 0;
    ds.forEach((d) => { const s = stat(d); o += s.o; q += s.q; m += s.m; });
    const possible = o + q + m;
    return { possible, onTimePercent: pct(o, possible), prayedPercent: pct(o + q, possible) };
  };
  const between = (a, b) => { const out = []; for (let d = a < first ? first : a; d <= b && d <= today; d = addDays(d, 1)) out.push(d); return out; };
  const weeks = [];
  for (let i = 7; i >= 0; i--) { const end = addDays(today, -7 * i); const start = addDays(end, -6); weeks.push({ label: dayLabel(start), ...agg(between(start, end)) }); }
  const months = [];
  const base = new Date(today + 'T00:00:00Z');
  for (let k = 11; k >= 0; k--) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - k, 1));
    const ym = d.toISOString().slice(0, 7);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    months.push({ label: monthLabel(ym), ...agg(between(ym + '-01', last)) });
  }
  return { weeks, months };
}

async function build(req, user, range) {
  const key = RANGES[range] ? range : 'week';
  const spec = RANGES[key];
  const today = userNow(req).date;
  const docs = await Prayer.find({ user: user._id }).lean();
  const map = Object.fromEntries(docs.map((d) => [d.date, d]));
  const joined = new Date(user.createdAt.getTime() - offsetOf(req) * 60000).toISOString().slice(0, 10);
  const first = docs.reduce((m, d) => (d.date < m ? d.date : m), joined);
  let from = spec.days ? addDays(today, -(spec.days - 1)) : first;
  if (from < first) from = first;

  const days = [];
  for (let d = from; d <= today; d = addDays(d, 1)) days.push(d);

  // prayers
  const defs = await getDefs();
  const per = Object.fromEntries(prayers.PRAYERS.map((p) => [p, { ontime: 0, qaza: 0, missed: 0 }]));
  const nafl = Object.fromEntries(prayers.NAFL.map((p) => [p, 0]));
  let ontime = 0; let qaza = 0; let missed = 0;
  days.forEach((d) => {
    const doc = map[d];
    prayers.PRAYERS.forEach((p) => {
      const st = doc && doc[p];
      if (st === 'ontime') { ontime++; per[p].ontime++; }
      else if (st === 'qaza') { qaza++; per[p].qaza++; }
      else if (d < today) { missed++; per[p].missed++; }
    });
    prayers.NAFL.forEach((p) => { if (doc && doc[p]) nafl[p]++; });
  });
  const possible = ontime + qaza + missed;
  const dayCount = (d) => prayers.PRAYERS.filter((p) => map[d] && map[d][p]).length;
  const dayOnTime = (d) => prayers.PRAYERS.filter((p) => map[d] && map[d][p] === 'ontime').length;
  const all = (await prayers.compute(req, user)).stats;
  const nameOf = Object.fromEntries([...defs.fard, ...defs.nafl].map((d) => [d.key, d.name]));

  // Quran
  const rdays = await ReadingDay.find({ user: user._id, date: { $gte: from, $lte: today } }).lean();
  const rmap = Object.fromEntries(rdays.map((r) => [r.date, r.ayahs]));
  const ayahsInPeriod = rdays.reduce((n, r) => n + r.ayahs, 0);
  const rs = await readlog.readStats(user._id);
  const prog = await readlog.progressView(user._id);
  const peak = Math.max(1, ...Object.values(rmap));
  const qseries = bucket(days, (d) => ({ value: rmap[d] || 0 }), () => peak);

  const c = await S.counts(user._id);
  return {
    range: key, label: spec.label, from, to: today, days: days.length,
    prayers: {
      possible, onTime: ontime, qaza, missed, onTimePercent: pct(ontime, possible), completedPercent: pct(ontime + qaza, possible),
      streak: all.streak, bestStreak: all.best,
      perPrayer: prayers.PRAYERS.map((p) => ({ name: nameOf[p] || prayers.cap(p), ...per[p] })),
      nafl: prayers.NAFL.map((p) => ({ name: nameOf[p] || prayers.cap(p), count: nafl[p] })),
      series: bucket(days, (d) => ({ value: dayCount(d), ontime: dayOnTime(d) }), (n) => 5 * n),
    },
    quran: {
      ayahsInPeriod, readingDays: rdays.filter((r) => r.ayahs > 0).length, series: qseries,
      total: { ayahsRead: rs.totalRead, ayahs: rs.totalAyahs, percent: rs.percent, parasDone: rs.parasDone, surahsDone: rs.surahsDone },
      paras: rs.paraRead, label: prog.started ? prog.label : null,
    },
    trend: trends(map, first, today),
    learning: await learn.summary(user._id),
    social: { followers: c.followers, following: c.following },
  };
}

module.exports = { build, RANGES };
