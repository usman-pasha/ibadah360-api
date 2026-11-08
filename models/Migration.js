const mongoose = require('mongoose');
// Remembers which one-time data changes already ran, so they never run twice.
module.exports = mongoose.model('Migration', new mongoose.Schema({ key: { type: String, unique: true }, at: { type: Date, default: Date.now } }));
