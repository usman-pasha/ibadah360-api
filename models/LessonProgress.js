const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: String, required: true },
  done: { type: Boolean, default: false },
  bestScore: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  doneAt: Date,
}, { timestamps: true });
schema.index({ user: 1, key: 1 }, { unique: true });
module.exports = mongoose.model('LessonProgress', schema);
