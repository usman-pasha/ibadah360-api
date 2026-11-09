const mongoose = require('mongoose');
// The page each surah and each juz starts on, in the Print layout. One document.
module.exports = mongoose.model('MushafIndex', new mongoose.Schema({
  key: { type: String, unique: true },
  surahPage: [Number], // 114 numbers
  juzPage: [Number], // 30 numbers
}));
