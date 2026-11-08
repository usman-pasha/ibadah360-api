const mongoose = require('mongoose');
const five = () => ({ fajr: { type: Number, default: 0 }, dhuhr: { type: Number, default: 0 }, asr: { type: Number, default: 0 }, maghrib: { type: Number, default: 0 }, isha: { type: Number, default: 0 } });
// Qaza prayers a person owes from before (owed), how many they made up (madeUp), and a daily goal.
module.exports = mongoose.model('QazaPlan', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  owed: five(),
  madeUp: five(),
  dailyGoal: { type: Number, default: 5 },
}, { timestamps: true }));
