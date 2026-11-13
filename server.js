require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error('Missing MONGO_URI or JWT_SECRET. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const Prayer = require('./models/Prayer');
const User = require('./models/User');
const Migration = require('./models/Migration');
const Progress = require('./models/ReadingProgress');
const { uniqueUsername } = require('./services/social');
const { seedAll } = require('./seed');
const hijri = require('./services/hijri');

const app = express();
app.use(cors()); // lets a mobile app or another website call this API
app.use('/api/profile/avatar', express.json({ limit: '8mb' })); // a 5 MB photo is about 6.7 MB as base64
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 }));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, file) => res.set('Cache-Control', /[\\/]mushaf[\\/]/.test(file) ? 'public, max-age=604800' : 'no-cache'), // page pictures are cached for a week, everything else is always fresh
}));

// Everything the website shows comes from these routes. A mobile app can use exactly the same ones.
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 60 }), require('./routes/auth'));
app.use('/api/meta', require('./routes/meta'));
app.use('/api/profile/avatar', require('./routes/avatar'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/account', require('./routes/account'));
app.use('/api/users/search', rateLimit({ windowMs: 60 * 1000, limit: 60 })); // stops people scraping the user list
app.use('/api/users', require('./routes/users'));
app.use('/api/follow', require('./routes/follow'));
app.use('/api/about', require('./routes/about'));
app.use('/api/prayers', require('./routes/prayers'));
app.use('/api/times', require('./routes/times'));
app.use('/api/hijri', require('./routes/hijri'));
app.use('/api/quran', require('./routes/quran'));
app.use('/api/book', require('./routes/book'));
app.use('/api/duas', require('./routes/duas'));
app.use('/api/learn', require('./routes/learn'));
app.use('/api/tasbih', require('./routes/tasbih'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/lesson', require('./routes/lesson'));
app.use('/api/wisdom', require('./routes/wisdom'));
app.use('/api/khatam', require('./routes/khatam'));
app.use('/api/challenge', require('./routes/challenge'));
app.use('/api/badges', require('./routes/badges'));
app.use('/api/qaza', require('./routes/qaza'));
app.use('/api/ramadan', require('./routes/ramadan'));
app.use('/api/zakat', require('./routes/zakat'));
app.use('/api/places', rateLimit({ windowMs: 60 * 1000, limit: 20 }), require('./routes/places'));
app.use('/api/report', require('./routes/report'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ message: err.type === 'entity.parse.failed' ? 'Invalid JSON' : err.type === 'entity.too.large' ? 'That file is too big' : 'Server error' });
});

// Version 1 saved true/false. Later versions use 'ontime' / 'qaza' / null. Safe to run on every start.
async function migrate() {
  for (const p of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    await Prayer.collection.updateMany({ [p]: true }, { $set: { [p]: 'ontime' } });
    await Prayer.collection.updateMany({ [p]: false }, { $set: { [p]: null } });
  }
}

// Accounts made before usernames existed get one now (from their email), and can change it in My profile.
async function migrateUsernames() {
  const old = await User.find({ $or: [{ username: { $exists: false } }, { username: null }, { username: '' }] }).select('email name');
  for (const u of old) await User.updateOne({ _id: u._id }, { $set: { username: await uniqueUsername((u.email || '').split('@')[0] || u.name) } });
  if (old.length) console.log(`Gave usernames to ${old.length} existing account(s)`);
}

// Runs a data change one time only
async function runOnce(key, fn) {
  if (await Migration.exists({ key })) return;
  await fn();
  await Migration.create({ key });
}

const PORT = process.env.PORT || 3000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await migrate();
    await migrateUsernames();
    // Naskh is now the default script. People who were on the old default are moved to it once.
    await runOnce('naskh-default', () => Progress.updateMany({ script: 'indopak' }, { $set: { script: 'uthmani' } }));
    const seeded = await seedAll();
    if (seeded.length) console.log('Saved default content in MongoDB:', seeded.join(', '));
    if (!hijri.supported) console.warn('Warning: this Node.js has no Umm al-Qura calendar. Islamic dates will not work. Use Node.js 18+.');
    app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err.message));
