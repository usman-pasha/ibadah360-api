const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const User = require('../models/User');
const teacher = require('../services/teacher');
const { MESSAGE_MAX, HISTORY_MAX, HISTORY_ITEM_MAX } = require('../config/teacher');

// The free AI plans have limits, so each person gets a fair share
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, limit: 25, keyGenerator: (req) => String(req.userId),
  handler: (req, res) => res.status(429).json({ message: 'You asked many questions. Please wait a few minutes and try again.' }),
});

// Is the teacher set up?
router.get('/status', auth, (req, res) => { const s = teacher.settings(); res.json({ enabled: s.enabled, provider: s.name }); });

// Ask a question. Body: { message, history: [{ role: 'user' | 'assistant', content }] }
router.post('/ask', auth, limiter, safe(async (req, res) => {
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ message: 'Type your question first' });
  if (message.length > MESSAGE_MAX) return res.status(400).json({ message: `Please keep the question under ${MESSAGE_MAX} characters` });
  const raw = Array.isArray(req.body.history) ? req.body.history.slice(-HISTORY_MAX) : [];
  const history = raw.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, HISTORY_ITEM_MAX) }));
  const user = await User.findById(req.userId).select('madhab').lean();
  const answer = await teacher.ask({ message, history, madhab: user && user.madhab });
  res.json({ answer });
}));

module.exports = router;
