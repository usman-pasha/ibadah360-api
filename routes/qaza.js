const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const User = require('../models/User');
const qaza = require('../services/qaza');

const withUser = (fn) => safe(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'Account not found' });
  await fn(req, user);
  res.json(await qaza.summary(req, user));
});

router.get('/', auth, withUser(async () => {}));
// body: { fajr, dhuhr, asr, maghrib, isha, dailyGoal }  how many qaza prayers you owe of each, and your daily goal
router.put('/setup', auth, withUser((req) => qaza.setup(req.userId, req.body)));
router.post('/pray', auth, withUser((req, user) => qaza.pray(req, user, req.body.prayer, req.body.count)));
router.post('/undo', auth, withUser((req, user) => qaza.undo(req, user, req.body.prayer)));

module.exports = router;
