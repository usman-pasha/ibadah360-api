// Profile photo: PUT { image: 'data:image/jpeg;base64,...' }, DELETE, GET /status
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const User = require('../models/User');
const cloud = require('../services/cloudinary');
const { readDataUri } = require('../utils/image');
const { MAX_BYTES } = require('../config/avatar');

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 15, keyGenerator: (req) => String(req.userId),
  handler: (req, res) => res.status(429).json({ message: 'You changed your photo many times. Please try again later.' }),
});

router.get('/status', auth, (req, res) => res.json({ enabled: cloud.enabled(), maxBytes: MAX_BYTES }));

router.put('/', auth, limiter, safe(async (req, res) => {
  if (!cloud.enabled()) return res.status(503).json({ message: 'Photo upload is not set up on this server yet.' });
  const p = readDataUri(req.body.image);
  if (p.error) return res.status(400).json({ message: p.error });
  const url = await cloud.uploadAvatar(req.userId, p.dataUri);
  await User.updateOne({ _id: req.userId }, { avatar: url });
  res.json({ avatar: url });
}));

router.delete('/', auth, limiter, safe(async (req, res) => {
  const u = await User.findById(req.userId).select('avatar');
  if (!u) return res.status(404).json({ message: 'Account not found' });
  if (u.avatar && cloud.enabled()) await cloud.removeAvatar(req.userId).catch((e) => console.error('Could not delete the old photo:', e.message));
  u.avatar = '';
  await u.save();
  res.json({ avatar: '' });
}));

module.exports = router;
