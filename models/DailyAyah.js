const mongoose = require('mongoose');
// The list the "ayah of the day" picks from.
module.exports = mongoose.model('DailyAyah', new mongoose.Schema({ order: Number, surah: Number, ayah: Number }));
