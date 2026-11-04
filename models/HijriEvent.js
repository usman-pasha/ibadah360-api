const mongoose = require('mongoose');
// Important Islamic dates. m = Hijri month (1-12), d = day.
module.exports = mongoose.model('HijriEvent', new mongoose.Schema({
  m: Number, d: Number, name: String, note: String, eid: { type: Boolean, default: false },
}));
