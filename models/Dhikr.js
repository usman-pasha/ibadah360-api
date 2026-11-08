const mongoose = require('mongoose');
module.exports = mongoose.model('Dhikr', new mongoose.Schema({ order: Number, key: { type: String, unique: true }, ar: String, tr: String, en: String, target: Number }));
