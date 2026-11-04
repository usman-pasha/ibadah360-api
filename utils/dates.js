// All "today" logic lives on the server. Clients send their timezone in the X-TZ-Offset header
// (minutes, same value as JavaScript getTimezoneOffset). Without it we assume India (IST, UTC+5:30).
const validDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d + 'T00:00:00Z'));
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const offsetOf = (req) => { const o = parseInt(req.headers['x-tz-offset'], 10); return isNaN(o) ? -330 : o; };
const userNow = (req) => {
  const d = new Date(Date.now() - offsetOf(req) * 60000);
  return { date: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
};
const toMin = (t) => { const [h, m] = String(t).slice(0, 5).split(':').map(Number); return h * 60 + m; };
const hhmm = (min) => { const m = ((min % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const time12 = (t) => {
  const [h, m] = String(t).slice(0, 5).split(':').map(Number);
  return new Date(Date.UTC(2000, 0, 1, h, m)).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
};
const at = (s) => new Date(s + 'T12:00:00Z');
const longDate = (s) => at(s).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthName = (ym) => at(ym + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortMonth = (s) => at(s).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const shortDay = (s) => at(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dayNumber = (s) => Math.floor(new Date(s + 'T00:00:00Z').getTime() / 864e5);
module.exports = { validDate, addDays, offsetOf, userNow, toMin, hhmm, time12, at, longDate, monthName, shortMonth, shortDay, dayNumber };
