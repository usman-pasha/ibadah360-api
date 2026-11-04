const PrayerDef = require('../models/PrayerDef');
const HijriEvent = require('../models/HijriEvent');

// Small 60 second memory cache, because these tables almost never change.
const cache = {};
async function cached(name, load) {
  const c = cache[name];
  if (c && Date.now() - c.at < 60000) return c.value;
  const value = await load();
  cache[name] = { at: Date.now(), value };
  return value;
}

const getDefs = () => cached('defs', async () => {
  const all = await PrayerDef.find().sort({ order: 1 }).lean();
  return { fard: all.filter((d) => d.kind === 'fard'), nafl: all.filter((d) => d.kind === 'nafl') };
});
const getEvents = () => cached('events', () => HijriEvent.find().lean());

module.exports = { getDefs, getEvents };
