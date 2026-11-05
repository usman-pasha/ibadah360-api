const mongoose = require('mongoose');
// The 30 paras (juz). Each starts at surah:ayah and ends just before the next para starts.
module.exports = mongoose.model('Para', new mongoose.Schema({
  number: { type: Number, unique: true },
  name: String,
  startSurah: Number,
  startAyah: Number,
}));
