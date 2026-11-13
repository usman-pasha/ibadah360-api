const mongoose = require('mongoose');
// The lesson and quiz written for one day in one language. Saved so the AI writes it only once.
const schema = new mongoose.Schema({
  date: { type: String, required: true },
  lang: { type: String, required: true },
  topic: String,
  title: String,
  body: String,
  questions: [{ _id: false, q: String, options: [String], answer: Number, explain: String }],
}, { timestamps: true });
schema.index({ date: 1, lang: 1 }, { unique: true });
module.exports = mongoose.model('DailyLesson', schema);
