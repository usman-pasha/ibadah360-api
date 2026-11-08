const mongoose = require('mongoose');
// How many times each dhikr was said on each day.
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  key: { type: String, required: true },
  count: { type: Number, default: 0 },
});
schema.index({ user: 1, date: 1, key: 1 }, { unique: true });
module.exports = mongoose.model('TasbihDay', schema);
