const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  // Social profile (Instagram style)
  username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  bio: { type: String, default: '', maxlength: 150 },
  avatar: { type: String, default: '' }, // profile photo: https address on Cloudinary, or empty
  isPrivate: { type: Boolean, default: false }, // private: people must send a follow request
  // Namaz time settings. Defaults are for Bengaluru, Karnataka, India.
  city: { type: String, default: 'Bengaluru' },
  state: { type: String, default: 'Karnataka' },
  madhab: { type: String, default: 'hanafi' },   // 'hanafi' or 'shafi' (Asr time)
  method: { type: String, default: '1' },        // 1 = Karachi, 3 = Muslim World League
  hijriAdj: { type: Number, default: -1 },       // India usually sights the moon 1 day after Saudi Arabia
  password: { type: String, required: function () { return !this.googleId; } }, // Google accounts may have no password
  googleId: { type: String, unique: true, sparse: true },
  fastQadaMade: { type: Number, default: 0 }, // missed Ramadan fasts that were made up later
  resetTokenHash: String,
  resetExpires: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
