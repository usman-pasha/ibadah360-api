const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  surah: Number,
  number: Number, // ayah number inside the surah
  uthmani: String, // Madani script
  indopak: String, // Indian (Indo-Pak) script
  tr: { en: String, ur: String, hi: String, bn: String, ta: String, ml: String }, // translations
});
schema.index({ surah: 1, number: 1 }, { unique: true });
module.exports = mongoose.model('Ayah', schema);
