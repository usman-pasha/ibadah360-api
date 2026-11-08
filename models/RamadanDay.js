const mongoose = require('mongoose');
// One row per person per Ramadan day: did they fast, why not, and how many rakats of Taraweeh.
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  hijriYear: Number,
  hijriDay: Number,
  fasted: { type: String, default: null }, // 'yes', 'no' or null
  reason: { type: String, default: '' },
  taraweeh: { type: Number, default: 0 },
});
schema.index({ user: 1, date: 1 }, { unique: true });
schema.index({ user: 1, hijriYear: 1 });
module.exports = mongoose.model('RamadanDay', schema);
