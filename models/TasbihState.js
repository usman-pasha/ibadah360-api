const mongoose = require('mongoose');
// The counter the person is using right now.
module.exports = mongoose.model('TasbihState', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  key: { type: String, default: 'subhanallah' },
  count: { type: Number, default: 0 },
  target: { type: Number, default: 33 },
  rounds: { type: Number, default: 0 },
}, { timestamps: true }));
