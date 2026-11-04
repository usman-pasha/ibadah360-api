const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const User = require('../models/User');
const { timesView } = require('../services/times');
const { userNow } = require('../utils/dates');

// Prayer times for the logged-in user's city, madhab and method.
router.get('/', auth, safe(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'Account not found' });
  res.json(await timesView(user, userNow(req)));
}));

module.exports = router;
