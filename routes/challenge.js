const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const challenge = require('../services/challenge');
const { userNow } = require('../utils/dates');

const today = (req) => userNow(req).date;

router.get('/', auth, safe(async (req, res) => res.json(await challenge.list(req.userId, today(req)))));
router.post('/', auth, safe(async (req, res) => res.json(await challenge.create(req.userId, today(req), req.body))));
router.post('/join', auth, safe(async (req, res) => res.json(await challenge.join(req.userId, today(req), req.body.code))));
router.get('/:id', auth, safe(async (req, res) => res.json(await challenge.view(await challenge.load(req.params.id, req.userId), req.userId, today(req)))));
router.post('/:id/leave', auth, safe(async (req, res) => res.json(await challenge.leave(req.userId, req.params.id))));

module.exports = router;
