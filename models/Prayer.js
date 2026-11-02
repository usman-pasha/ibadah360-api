const mongoose = require('mongoose');

// One document per user per day. date is "YYYY-MM-DD".
// Each prayer is null (not marked), 'ontime' (locked) or 'qaza' (made up later).
const field = { type: String, default: null };

const prayerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  fajr: field,
  dhuhr: field,
  asr: field,
  maghrib: field,
  isha: field,
  // optional prayers: 'done' or null
  tahajjud: field,
  ishraq: field,
  duha: field,
  awwabin: field,
  witr: field,
});

prayerSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Prayer', prayerSchema);
