const mongoose = require('mongoose');
// A badge or milestone. It is earned when the person's number for "metric" reaches "threshold".
module.exports = mongoose.model('Badge', new mongoose.Schema({
  key: { type: String, unique: true }, order: Number, group: String, title: String, description: String, metric: String, threshold: Number,
}));
