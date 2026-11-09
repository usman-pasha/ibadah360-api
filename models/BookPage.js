const mongoose = require('mongoose');
// One page of the 604-page Madani Quran, saved the first time it is opened.
module.exports = mongoose.model('BookPage', new mongoose.Schema({
  page: { type: Number, unique: true },
  juz: Number,
  ayahs: [{ _id: false, surah: Number, number: Number, g: Number, text: String }], // g = ayah number 1..6236 (names the audio file)
}));
