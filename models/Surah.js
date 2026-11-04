const mongoose = require('mongoose');
module.exports = mongoose.model('Surah', new mongoose.Schema({
  number: { type: Number, unique: true },
  name: String,
  englishName: String,
  englishNameTranslation: String,
  revelationType: String,
  numberOfAyahs: Number,
  bismillah: String,
  loaded: {
    uthmani: { type: Boolean, default: false },
    tr: { type: Boolean, default: false },
    indopak: { type: Boolean, default: false },
  },
  tried: Date, // last download attempt, so failed parts are retried only every 10 minutes
}));
