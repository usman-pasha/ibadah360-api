const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const lesson = require('../services/lesson');
const { LANGUAGES } = require('../config/lessons');
const { userNow } = require('../utils/dates');

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, limit: 40, keyGenerator: (req) => String(req.userId),
  handler: (req, res) => res.status(429).json({ message: 'Too many requests. Please wait a few minutes.' }),
});

// Today's lesson and quiz (answers are not sent): /api/lesson/today?lang=en
router.get('/today', auth, limiter, safe(async (req, res) => {
  const date = userNow(req).date;
  const [t, stats] = await Promise.all([lesson.today(req.userId, date, req.query.lang), lesson.stats(req.userId, date)]);
  res.json({ ...t, languages: LANGUAGES, stats });
}));

// Just the numbers (for the share card). Does not start the AI.
router.get('/stats', auth, safe(async (req, res) => res.json(await lesson.stats(req.userId, userNow(req).date))));

// Send the answers { answers: [0..3, ...], lang }. The first try of the day counts.
router.post('/today/submit', auth, limiter, safe(async (req, res) => {
  const date = userNow(req).date;
  const result = await lesson.submit(req.userId, date, req.body.lang, req.body.answers);
  res.json({ result, stats: await lesson.stats(req.userId, date) });
}));

module.exports = router;
