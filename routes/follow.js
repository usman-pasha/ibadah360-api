const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const Follow = require('../models/Follow');
const S = require('../services/social');

const int = (v, d, min, max) => { const n = parseInt(v, 10); return isNaN(n) ? d : Math.min(max, Math.max(min, n)); };
async function other(req, res) {
  const u = await S.findByUsername(req.params.username);
  if (!u) res.status(404).json({ message: 'User not found' });
  return u;
}

// Numbers for the menu badge: followers, following, pending requests
router.get('/summary', auth, safe(async (req, res) => res.json(await S.counts(req.userId))));

// Follow requests waiting for me (only private accounts get requests)
router.get('/requests', auth, safe(async (req, res) => {
  res.json(await S.requestsFor(req.userId, int(req.query.page, 1, 1, 100000), int(req.query.limit, 10, 1, 30)));
}));

router.post('/requests/:username/accept', auth, safe(async (req, res) => {
  const u = await other(req, res); if (!u) return;
  const row = await Follow.findOneAndUpdate({ follower: u._id, following: req.userId, status: 'pending' }, { $set: { status: 'accepted' } }, { new: true });
  if (!row) return res.status(404).json({ message: 'There is no pending request from this person' });
  res.json(await S.counts(req.userId));
}));

router.delete('/requests/:username', auth, safe(async (req, res) => {
  const u = await other(req, res); if (!u) return;
  await Follow.deleteOne({ follower: u._id, following: req.userId, status: 'pending' });
  res.json(await S.counts(req.userId));
}));

// Remove one of my followers
router.delete('/followers/:username', auth, safe(async (req, res) => {
  const u = await other(req, res); if (!u) return;
  await Follow.deleteOne({ follower: u._id, following: req.userId, status: 'accepted' });
  res.json(await S.counts(req.userId));
}));

module.exports = router;
