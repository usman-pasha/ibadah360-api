const mongoose = require('mongoose');
// Lessons of the learning path. Levels 1 and 2 have a text lesson with a quiz.
// Level 3 lessons point to a surah, level 4 lessons to a para. Those finish by reading.
module.exports = mongoose.model('Lesson', new mongoose.Schema({
  key: { type: String, unique: true },
  level: Number,
  order: Number,
  title: String,
  summary: String,
  body: [{ title: String, text: String }],
  drills: [{ ar: String, tr: String, note: String }],
  quizKind: String, // 'letters', 'syllables' or 'fixed'
  quiz: [{ q: String, options: [String], answer: String }],
  surah: Number,
  para: Number,
}));
