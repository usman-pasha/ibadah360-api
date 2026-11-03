require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const path = require('path');

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error('Missing MONGO_URI or JWT_SECRET. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => res.set('Cache-Control', 'no-cache'), // always load the newest page files
}));

// Slow down password guessing
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 60 }), require('./routes/auth'));
app.use('/api/about', require('./routes/about'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/prayers', require('./routes/prayers'));

const Prayer = require('./models/Prayer');
const About = require('./models/About');
const aboutSeed = require('./seed/aboutSeed');
const NAMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

// Version 1 saved true/false. Version 2 uses 'ontime' / 'qaza' / null.
// Convert old data so those days can be marked again. Safe to run on every start.
async function migrate() {
  for (const p of NAMES) {
    await Prayer.collection.updateMany({ [p]: true }, { $set: { [p]: 'ontime' } });
    await Prayer.collection.updateMany({ [p]: false }, { $set: { [p]: null } });
  }
}

// Fill the About us page the first time. Existing data is never overwritten here.
async function seedAboutIfMissing() {
  if (!(await About.exists({ key: 'main' }))) {
    await About.create(aboutSeed);
    console.log('About us data seeded');
  }
}

const PORT = process.env.PORT || 3000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await migrate();
    await seedAboutIfMissing();
    app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err.message));
