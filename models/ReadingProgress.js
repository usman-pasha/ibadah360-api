const mongoose = require('mongoose');
// Where each person stopped reading the Quran, plus their reading choices. One document per user.
module.exports = mongoose.model('ReadingProgress', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  mode: { type: String, default: 'para' }, // 'para' or 'surah'
  surah: { type: Number, default: 1 },
  ayah: { type: Number, default: 1 },
  script: { type: String, default: 'indopak' },
  lang: { type: String, default: 'en' },
  size: { type: Number, default: 1.7 },
}, { timestamps: true }));
