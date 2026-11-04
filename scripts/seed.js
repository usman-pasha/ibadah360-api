// Resets all app content in MongoDB to the defaults in /seed:  npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const { seedAll } = require('../seed');

(async () => {
  if (!process.env.MONGO_URI) { console.error('Set MONGO_URI in .env first'); process.exit(1); }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Saved to MongoDB:', (await seedAll({ force: true })).join(', '));
  } catch (e) { console.error('Seeding failed:', e.message); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
})();
