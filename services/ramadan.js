// Ramadan mode: is it Ramadan (by the person's moon sighting setting), sehri and iftar times, a fasting tracker and Taraweeh.
const RamadanDay = require('../models/RamadanDay');
const User = require('../models/User');
const hijri = require('./hijri');
const { getTimings } = require('./times');
const { getEvents } = require('./content');
const { userNow, toMin, time12, validDate } = require('../utils/dates');

const REASONS = ['sick', 'travel', 'period', 'pregnancy', 'other'];
const bad = (message) => Object.assign(new Error(message), { status: 400, expose: true });
const inLabel = (mins) => `${mins >= 60 ? Math.floor(mins / 60) + ' h ' : ''}${mins % 60} min`;
const diffDays = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5);

async function view(req, user) {
  if (!hijri.supported) return { supported: false };
  const now = userNow(req);
  const adj = user.hijriAdj;
  const h = hijri.hijriOf(now.date, adj);
  const active = h.m === 9;
  const year = active || h.m > 9 ? h.y : h.y - 1; // the Ramadan shown: this one, or the last one
  const evMap = hijri.eventMap(await getEvents());
  const month = hijri.month(now.date, adj, (year - h.y) * 12 + (9 - h.m), evMap);
  const [rows, missedAll] = await Promise.all([
    RamadanDay.find({ user: user._id, hijriYear: year }).lean(),
    RamadanDay.countDocuments({ user: user._id, fasted: 'no' }),
  ]);
  const byDate = Object.fromEntries(rows.map((r) => [r.date, r]));
  const days = month.days.map((d) => {
    const r = byDate[d.date] || {};
    return { day: d.hijri.d, date: d.date, gDay: d.gDay, fasted: r.fasted || null, reason: r.reason || '', taraweeh: r.taraweeh || 0, isToday: d.date === now.date, future: d.date > now.date };
  });

  let times = null;
  if (active) {
    const t = await getTimings(user, now.date).catch(() => null);
    if (t && t.fajr && t.maghrib) {
      const f = toMin(t.fajr); const m = toMin(t.maghrib);
      let name; let mins;
      if (now.minutes < f) { name = 'Sehri ends (Fajr)'; mins = f - now.minutes; }
      else if (now.minutes < m) { name = 'Iftar'; mins = m - now.minutes; }
      else { name = 'Sehri ends tomorrow (Fajr)'; mins = 1440 - now.minutes + f; }
      times = { sehri: { time: t.fajr, label: time12(t.fajr) }, iftar: { time: t.maghrib, label: time12(t.maghrib) }, imsak: t.imsak ? { time: t.imsak, label: time12(t.imsak) } : null, next: { name, inLabel: inLabel(mins) } };
    }
  }

  let nextRamadan = null;
  if (!active) {
    const nm = hijri.month(now.date, adj, h.m < 9 ? 9 - h.m : 21 - h.m, evMap);
    nextRamadan = { date: nm.days[0].date, label: nm.days[0].label, daysUntil: diffDays(now.date, nm.days[0].date) };
  }
  const fasted = rows.filter((r) => r.fasted === 'yes').length;
  const missed = rows.filter((r) => r.fasted === 'no').length;
  return {
    supported: true, active, year, label: `Ramadan ${year} AH`,
    dayNumber: active ? h.d : null, dayCount: days.length,
    today: active ? days.find((d) => d.isToday) || null : null,
    times, days, nextRamadan,
    totals: { fasted, missed, taraweehNights: rows.filter((r) => r.taraweeh > 0).length, logged: fasted + missed },
    reasons: REASONS, owedFasts: Math.max(0, missedAll - (user.fastQadaMade || 0)), qadaMade: user.fastQadaMade || 0,
  };
}

async function setDay(req, user, body) {
  const today = userNow(req).date;
  const date = body.date === undefined ? today : String(body.date);
  if (!validDate(date)) throw bad('Invalid date');
  if (date > today) throw bad('You cannot record a day that has not come yet');
  const h = hijri.hijriOf(date, user.hijriAdj);
  if (h.m !== 9) throw bad('That day is not in Ramadan');
  const set = { hijriYear: h.y, hijriDay: h.d };
  if (body.fasted !== undefined) {
    if (!['yes', 'no', null].includes(body.fasted)) throw bad('Fasted must be yes, no or empty');
    set.fasted = body.fasted;
    set.reason = body.fasted === 'no' ? (REASONS.includes(body.reason) ? body.reason : 'other') : '';
  }
  if (body.taraweeh !== undefined) {
    const t = Number(body.taraweeh);
    if (!Number.isInteger(t) || t < 0 || t > 40) throw bad('Taraweeh rakats must be 0 to 40');
    set.taraweeh = t;
  }
  await RamadanDay.updateOne({ user: user._id, date }, { $set: set }, { upsert: true });
}

// Record that one missed fast was made up (add 1) or undo it (add -1)
async function qada(user, add) {
  if (![1, -1].includes(add)) throw bad('Add must be 1 or -1');
  const missed = await RamadanDay.countDocuments({ user: user._id, fasted: 'no' });
  const made = user.fastQadaMade || 0;
  if (add === 1 && made >= missed) throw bad('No missed fasts left to make up');
  if (add === -1 && made <= 0) throw bad('Nothing to undo');
  await User.updateOne({ _id: user._id }, { $inc: { fastQadaMade: add } });
}

module.exports = { view, setDay, qada };
