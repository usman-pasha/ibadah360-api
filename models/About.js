const mongoose = require('mongoose');

// One document (key "main") holds everything shown on the About us page.
const aboutSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  appName: String,
  version: String,
  tagline: String,
  about: String,
  features: [String],
  team: [{ name: String, role: String, email: String, phone: String }],
  contact: { email: String, phone: String, address: String },
  disclaimer: String,
  copyright: String,
}, { timestamps: true });

module.exports = mongoose.model('About', aboutSchema);
