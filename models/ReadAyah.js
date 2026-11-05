const mongoose = require('mongoose');
// One row for every ayah a person has read. Used for Quran progress, paras finished and the learning path.
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  surah: Number,
  ayah: Number,
  times: { type: Number, default: 0 },
  firstReadAt: Date,
  lastReadAt: Date,
});
schema.index({ user: 1, surah: 1, ayah: 1 }, { unique: true });
module.exports = mongoose.model('ReadAyah', schema);
