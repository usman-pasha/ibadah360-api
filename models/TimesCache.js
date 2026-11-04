const mongoose = require('mongoose');
// Prayer times downloaded from aladhan.com, kept so the same city and day is fetched only once.
module.exports = mongoose.model('TimesCache', new mongoose.Schema({
  key: { type: String, unique: true },
  data: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 10 },
}));
