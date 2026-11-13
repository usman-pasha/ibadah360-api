const mongoose = require('mongoose');
// A person's score for the daily quiz. Only the first try of each day counts.
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  lang: { type: String, required: true },
  score: Number,
  total: Number,
  answers: [Number],
}, { timestamps: true });
schema.index({ user: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('QuizResult', schema);
