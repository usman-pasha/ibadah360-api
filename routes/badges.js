const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const User = require('../models/User');
const badges = require('../services/badges');

// All badges: earned, and the ones still to earn with progress. newlyEarned lists badges earned by this very call.
router.get('/', auth, safe(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'Account not found' });
  res.json(await badges.evaluate(req, user));
}));

module.exports = router;
