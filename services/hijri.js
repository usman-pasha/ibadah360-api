// Islamic (Hijri) calendar, worked out on the server with the Umm al-Qura calendar built into Node.js.
// "adj" shifts the date for local moon sighting (India is usually 1 day behind Saudi Arabia).
const { addDays, at, longDate, shortMonth, shortDay } = require('../utils/dates');

const MONTHS = ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhul Qa'dah", 'Dhul Hijjah'];
const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' });

function hijriOf(date, adj = 0) {
  const o = {};
  fmt.formatToParts(at(addDays(date, adj))).forEach((p) => { if (['day', 'month', 'year'].includes(p.type)) o[p.type[0]] = Number(p.value); });
  return o; // { d, m, y }
}
let supported = false;
try { supported = hijriOf('2026-03-20').y < 1700; } catch (e) { supported = false; }

const text = (h) => `${h.d} ${MONTHS[h.m - 1]} ${h.y} AH`;
const eventMap = (events) => events.reduce((m, e) => { (m[e.m + '-' + e.d] = m[e.m + '-' + e.d] || []).push(e); return m; }, {});
const monthLen = (first, adj) => { const m = hijriOf(first, adj).m; let n = 0; while (n < 31 && hijriOf(addDays(first, n), adj).m === m) n++; return n; };

function firstOfMonth(today, adj, k) {
  let first = addDays(today, -(hijriOf(today, adj).d - 1));
  for (let i = 0; i < Math.min(Math.abs(k), 600); i++) {
    if (k > 0) first = addDays(first, monthLen(first, adj));
    else { const last = addDays(first, -1); first = addDays(last, -(hijriOf(last, adj).d - 1)); }
  }
  return first;
}

function dayInfo(date, adj, evMap) {
  const h = hijriOf(date, adj);
  const events = (evMap[h.m + '-' + h.d] || []).map((e) => ({ name: e.name, note: e.note, eid: !!e.eid }));
  const weekday = at(date).getUTCDay();
  const whiteDay = [13, 14, 15].includes(h.d);
  const friday = weekday === 5;
  const notes = events.map((e) => ({ title: e.name, text: e.note }));
  if (whiteDay) notes.push({ title: 'White days (Ayyam al-Bidh)', text: 'The 13th, 14th and 15th of each month. Fasting is recommended.' });
  if (friday) notes.push({ title: "Jumu'ah (Friday)", text: 'The weekly day of gathering. The congregational prayer takes the place of Dhuhr.' });
  return {
    date, label: longDate(date), gDay: Number(date.slice(8)), weekday,
    hijri: { d: h.d, m: h.m, y: h.y, monthName: MONTHS[h.m - 1], text: text(h) },
    events, eid: events.some((e) => e.eid), whiteDay, friday, notes,
  };
}

function month(today, adj, offset, evMap) {
  const k = Math.max(-600, Math.min(600, offset));
  const first = firstOfMonth(today, adj, k);
  const h0 = hijriOf(first, adj);
  const len = monthLen(first, adj);
  const last = addDays(first, len - 1);
  const days = [];
  for (let i = 0; i < len; i++) { const d = dayInfo(addDays(first, i), adj, evMap); d.isToday = d.date === today; days.push(d); }
  return {
    offset: k, prevOffset: k - 1, nextOffset: k + 1,
    label: `${MONTHS[h0.m - 1]} ${h0.y} AH`,
    gregorianLabel: `${shortMonth(first)} to ${shortMonth(last)}`,
    leadBlanks: at(first).getUTCDay(), days,
  };
}

function upcoming(today, adj, evMap, limit) {
  const out = [];
  for (let i = 0; i < 400 && out.length < limit; i++) {
    const date = addDays(today, i);
    const info = dayInfo(date, adj, evMap);
    info.events.forEach((e) => out.push({ ...e, date, dateLabel: shortDay(date), hijriText: info.hijri.text, inDays: i, inLabel: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `in ${i} days` }));
  }
  return out.slice(0, limit);
}

module.exports = { supported, hijriOf, dayInfo, month, upcoming, eventMap };
