const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const khatam = require('../services/khatam');

const juzOf = (v) => Number(v);

router.get('/', auth, safe(async (req, res) => res.json(await khatam.list(req.userId))));
router.post('/', auth, safe(async (req, res) => res.json(await khatam.create(req.userId, req.body.name))));
router.post('/join', auth, safe(async (req, res) => res.json(await khatam.join(req.userId, req.body.code))));
router.get('/:id', auth, safe(async (req, res) => res.json(await khatam.view(await khatam.load(req.params.id, req.userId), req.userId))));
router.post('/:id/claim', auth, safe(async (req, res) => res.json(await khatam.claim(req.userId, req.params.id, juzOf(req.body.juz)))));
router.post('/:id/release', auth, safe(async (req, res) => res.json(await khatam.release(req.userId, req.params.id, juzOf(req.body.juz)))));
router.post('/:id/done', auth, safe(async (req, res) => res.json(await khatam.setDone(req.userId, req.params.id, juzOf(req.body.juz), req.body.done !== false))));
router.post('/:id/restart', auth, safe(async (req, res) => res.json(await khatam.restart(req.userId, req.params.id))));
router.post('/:id/leave', auth, safe(async (req, res) => res.json(await khatam.leave(req.userId, req.params.id))));

module.exports = router;
