const mongoose = require('mongoose');

// One row means "follower follows following".
// status "accepted": they follow. status "pending": a follow request to a private account, waiting for approval.
const schema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['accepted', 'pending'], default: 'accepted' },
}, { timestamps: true });

schema.index({ follower: 1, following: 1 }, { unique: true });
schema.index({ following: 1, status: 1, createdAt: -1 });
schema.index({ follower: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Follow', schema);
