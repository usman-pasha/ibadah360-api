const mongoose = require('mongoose');
module.exports = mongoose.model('Dua', new mongoose.Schema({
  order: Number, cat: String, title: String, src: String, ar: String, tr: String, en: String,
}));
