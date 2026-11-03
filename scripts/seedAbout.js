// Saves (or resets) the About us data in MongoDB:  npm run seed:about
require('dotenv').config();
const mongoose = require('mongoose');
const About = require('../models/About');
const seed = require('../seed/aboutSeed');

(async () => {
  if (!process.env.MONGO_URI) {
    console.error('Set MONGO_URI in .env first');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await About.findOneAndUpdate({ key: seed.key }, seed, { upsert: true, new: true, setDefaultsOnInsert: true });
    console.log('About us data saved to MongoDB (collection: abouts)');
  } catch (e) {
    console.error('Seeding failed:', e.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
