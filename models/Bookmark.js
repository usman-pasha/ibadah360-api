const mongoose = require('mongoose');
// A bookmarked page in the Quran Book. One per user, layout and page.
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  layout: { type: String, default: 'text' }, // 'print' (scanned 610 pages) or 'text' (604 pages)
  page: { type: Number, required: true },
}, { timestamps: true });
schema.index({ user: 1, layout: 1, page: 1 }, { unique: true });
module.exports = mongoose.model('Bookmark', schema);
