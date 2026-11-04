const mongoose = require('mongoose');
// Names, Arabic names and tips for the 5 daily prayers (kind "fard") and voluntary prayers (kind "nafl").
module.exports = mongoose.model('PrayerDef', new mongoose.Schema({
  kind: { type: String, enum: ['fard', 'nafl'], required: true },
  key: { type: String, required: true, unique: true },
  order: Number,
  name: String,
  ar: String,
  tip: String,
}));
