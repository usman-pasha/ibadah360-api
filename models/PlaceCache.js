const mongoose = require('mongoose');
// Map search results kept for a day, so the free map servers are not asked again and again.
module.exports = mongoose.model('PlaceCache', new mongoose.Schema({
  key: { type: String, unique: true },
  data: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
}));
