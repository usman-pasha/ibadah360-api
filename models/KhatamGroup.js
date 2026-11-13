const mongoose = require('mongoose');
// Friends or family finishing the whole Quran together, one juz (para) each.
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  round: { type: Number, default: 1 }, // how many times the group started a new khatam
  completedRounds: { type: Number, default: 0 },
  juz: [{ _id: false, n: Number, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, done: { type: Boolean, default: false }, doneAt: Date }],
}, { timestamps: true });
schema.index({ members: 1 });
module.exports = mongoose.model('KhatamGroup', schema);
