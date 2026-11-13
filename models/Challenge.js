const mongoose = require('mongoose');
// A friends or family challenge over some days. The leaderboard is worked out from what members already record in the app.
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  metric: { type: String, enum: ['prayers', 'quran', 'tasbih'], required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
}, { timestamps: true });
schema.index({ members: 1 });
module.exports = mongoose.model('Challenge', schema);
