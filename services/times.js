const TimesCache = require('../models/TimesCache');
const { MADHABS, METHODS } = require('../config/options');
const { toMin, hhmm, time12 } = require('../utils/dates');

const FARD = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const NAMES = { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };

async function fetchJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  return r.ok ? r.json() : null;
}

// Timings for the user's city and settings. Downloaded from aladhan.com once, then kept in MongoDB.
async function getTimings(user, date) {
  const key = [date, user.city, user.state, user.madhab, user.method].join('|').toLowerCase();
  const hit = await TimesCache.findOne({ key }).lean();
  if (hit) return hit.data;

  const [y, m, d] = date.split('-');
  const base = `https://api.aladhan.com/v1/timingsByCity/${d}-${m}-${y}?city=${encodeURIComponent(user.city)}&country=India&method=${user.method}&school=${user.madhab === 'hanafi' ? 1 : 0}`;
  let f = null;
  for (const url of [user.state ? `${base}&state=${encodeURIComponent(user.state)}` : base, base]) {
    try {
      const j = await fetchJson(url);
      if (j && j.data && j.data.timings) { f = j.data.timings; break; }
    } catch (e) { /* try the next address */ }
  }
  if (!f) return null;
  const c = (v) => (v ? String(v).slice(0, 5) : null);
  const data = { imsak: c(f.Imsak), fajr: c(f.Fajr), sunrise: c(f.Sunrise), dhuhr: c(f.Dhuhr), asr: c(f.Asr), maghrib: c(f.Maghrib), isha: c(f.Isha), midnight: c(f.Midnight), lastthird: c(f.Lastthird) };
  await TimesCache.updateOne({ key }, { $set: { data, createdAt: new Date() } }, { upsert: true }).catch(() => {});
  return data;
}

// Everything the Prayer times screen needs, already worked out.
async function timesView(user, now) {
  const opt = (list, v) => (list.find((o) => String(o.value) === String(v)) || {}).label;
  const base = {
    date: now.date,
    location: { city: user.city, state: user.state, country: 'India' },
    madhab: { value: user.madhab, label: opt(MADHABS, user.madhab) },
    method: { value: user.method, label: opt(METHODS, user.method) },
    source: 'aladhan.com',
  };
  const t = await getTimings(user, now.date);
  if (!t) return { ...base, available: false, message: 'Could not load prayer times right now. Please try again in a little while.' };

  const timings = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']
    .filter((k) => t[k])
    .map((k) => ({ key: k, name: NAMES[k], time: t[k], label: time12(t[k]) }));

  let next = FARD.find((k) => toMin(t[k]) > now.minutes);
  let mins;
  let tomorrow = false;
  if (next) mins = toMin(t[next]) - now.minutes;
  else { next = 'fajr'; mins = 1440 - now.minutes + toMin(t.fajr); tomorrow = true; }
  const current = [...FARD].reverse().find((k) => toMin(t[k]) <= now.minutes) || null;

  const voluntary = [];
  if (t.sunrise) voluntary.push({ name: 'Ishraq and Duha begin (about)', label: time12(hhmm(toMin(t.sunrise) + 15)) });
  if (t.midnight) voluntary.push({ name: 'Islamic midnight', label: time12(t.midnight) });
  if (t.lastthird) voluntary.push({ name: 'Tahajjud: last third of the night begins', label: time12(t.lastthird) });

  return {
    ...base, available: true, timings, current, voluntary,
    next: { key: next, name: NAMES[next] + (tomorrow ? ' (tomorrow)' : ''), time: t[next], label: time12(t[next]), inMinutes: mins, inLabel: `${mins >= 60 ? Math.floor(mins / 60) + ' h ' : ''}${mins % 60} min` },
  };
}

module.exports = { getTimings, timesView };
