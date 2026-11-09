const mongoose = require('mongoose');
// Which ayahs are on each page of the Print layout (610 pages). Downloaded once, then served from here.
module.exports = mongoose.model('MushafPage', new mongoose.Schema({
  page: { type: Number, unique: true },
  keys: [String], // 'surah:ayah', in reading order
}));
