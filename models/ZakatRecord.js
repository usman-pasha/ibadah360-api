const mongoose = require('mongoose');
module.exports = mongoose.model('ZakatRecord', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  inputs: mongoose.Schema.Types.Mixed,
  result: mongoose.Schema.Types.Mixed,
}, { timestamps: true }));
