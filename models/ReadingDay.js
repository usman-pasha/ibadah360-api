const mongoose = require('mongoose');
// How many ayahs a person read on each day (for the progress report).
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  ayahs: { type: Number, default: 0 },
});
schema.index({ user: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('ReadingDay', schema);
