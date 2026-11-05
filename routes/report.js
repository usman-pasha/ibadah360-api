const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const User = require('../models/User');
const report = require('../services/report');

// /api/report?range=week | month | year | all
router.get('/', auth, safe(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'Account not found' });
  res.json(await report.build(req, user, String(req.query.range || 'week')));
}));

module.exports = router;
