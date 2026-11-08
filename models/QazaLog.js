const mongoose = require('mongoose');
const schema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, date: { type: String, required: true }, prayer: { type: String, required: true }, count: { type: Number, default: 0 } });
schema.index({ user: 1, date: 1, prayer: 1 }, { unique: true });
module.exports = mongoose.model('QazaLog', schema);
