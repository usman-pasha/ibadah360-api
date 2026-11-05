const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const learn = require('../services/learn');

// The whole path: 4 levels, every lesson with its progress, and the next lesson to do
router.get('/', auth, safe(async (req, res) => res.json(await learn.path(req.userId))));

router.get('/lessons/:key', auth, safe(async (req, res) => {
  const l = await learn.lesson(req.userId, req.params.key);
  if (!l) return res.status(404).json({ message: 'Lesson not found' });
  res.json(l);
}));

// 5 new questions every time
router.get('/lessons/:key/quiz', auth, safe(async (req, res) => res.json(await learn.makeQuiz(req.params.key))));

// body: { answers: [{ q: "L:3", pick: "Tha" }, ...] }. The server checks the answers.
router.post('/lessons/:key/quiz', auth, safe(async (req, res) => res.json(await learn.grade(req.userId, req.params.key, req.body.answers))));

module.exports = router;
