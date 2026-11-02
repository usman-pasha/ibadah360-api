const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  // Namaz time settings. Defaults are for Bengaluru, Karnataka, India.
  city: { type: String, default: 'Bengaluru' },
  state: { type: String, default: 'Karnataka' },
  madhab: { type: String, default: 'hanafi' },   // 'hanafi' or 'shafi' (Asr time)
  method: { type: String, default: '1' },        // 1 = Karachi, 3 = Muslim World League
  hijriAdj: { type: Number, default: -1 },       // India usually sights the moon 1 day after Saudi Arabia
  password: { type: String, required: true },
  resetTokenHash: String,
  resetExpires: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
