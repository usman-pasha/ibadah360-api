const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const User = require('../models/User');
const Follow = require('../models/Follow');
const S = require('../services/social');
const { SEARCH_MIN } = require('../config/social');

const int = (v, d, min, max) => { const n = parseInt(v, 10); return isNaN(n) ? d : Math.min(max, Math.max(min, n)); };

async function target(req, res) {
  const t = await S.findByUsername(req.params.username);
  if (!t) res.status(404).json({ message: 'User not found' });
  return t;
}

// /api/users/search?q=ra&page=1&limit=10  (name or username)
router.get('/search', auth, safe(async (req, res) => {
  const term = String(req.query.q || '').trim().replace(/^@/, '').slice(0, 40);
  const limit = int(req.query.limit, 10, 1, 30);
  if (term.length < SEARCH_MIN) return res.json({ users: [], total: 0, page: 1, pages: 1, limit });
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = { _id: { $ne: req.userId }, $or: [{ username: { $regex: '^' + esc, $options: 'i' } }, { name: { $regex: esc, $options: 'i' } }] };
  const total = await User.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(pages, int(req.query.page, 1, 1, 100000));
  const found = await User.find(filter).sort({ username: 1 }).skip((page - 1) * limit).limit(limit).select('username name bio avatar isPrivate').lean();
  const rels = await S.relations(req.userId, found);
  res.json({ total, page, pages, limit, users: found.map((u) => ({ ...S.publicUser(u), relationship: rels[String(u._id)] })) });
}));

// A profile card. Email, phone and city are never shown to other people.
router.get('/:username', auth, safe(async (req, res) => {
  const t = await target(req, res); if (!t) return;
  const rel = (await S.relations(req.userId, [t]))[String(t._id)];
  const c = await S.counts(t._id);
  res.json({ ...S.publicUser(t), joined: S.joinedLabel(t.createdAt), counts: { followers: c.followers, following: c.following }, relationship: rel, canViewConnections: S.canView(t, rel) });
}));

router.post('/:username/follow', auth, safe(async (req, res) => {
  const t = await target(req, res); if (!t) return;
  if (String(t._id) === String(req.userId)) return res.status(400).json({ message: 'You cannot follow yourself' });
  const existing = await Follow.findOne({ follower: req.userId, following: t._id });
  if (!existing) {
    try { await Follow.create({ follower: req.userId, following: t._id, status: t.isPrivate ? 'pending' : 'accepted' }); }
    catch (e) { if (e.code !== 11000) throw e; }
  }
  res.json(await S.followState(req.userId, t));
}));

// Unfollow, or cancel a pending request
router.delete('/:username/follow', auth, safe(async (req, res) => {
  const t = await target(req, res); if (!t) return;
  await Follow.deleteOne({ follower: req.userId, following: t._id });
  res.json(await S.followState(req.userId, t));
}));

for (const kind of ['followers', 'following']) {
  router.get(`/:username/${kind}`, auth, safe(async (req, res) => {
    const t = await target(req, res); if (!t) return;
    const rel = (await S.relations(req.userId, [t]))[String(t._id)];
    if (!S.canView(t, rel)) return res.status(403).json({ message: 'This account is private. Follow them to see this list.' });
    const page = int(req.query.page, 1, 1, 100000);
    const limit = int(req.query.limit, 10, 1, 30);
    res.json(await (kind === 'followers' ? S.followersOf : S.followingOf)(t, req.userId, page, limit));
  }));
}

module.exports = router;
