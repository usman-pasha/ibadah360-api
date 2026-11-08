const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const User = require('../models/User');
const ramadan = require('../services/ramadan');

const withUser = (fn) => safe(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'Account not found' });
  if (fn) await fn(req, user);
  res.json(await ramadan.view(req, await User.findById(req.userId)));
});

router.get('/', auth, withUser());
// body: { date?, fasted: "yes" | "no" | null, reason?, taraweeh? }
router.post('/day', auth, withUser((req, user) => ramadan.setDay(req, user, req.body)));
// body: { add: 1 } a missed fast was made up, or { add: -1 } to undo
router.post('/qada', auth, withUser((req, user) => ramadan.qada(user, req.body.add)));

module.exports = router;
