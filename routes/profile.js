// PROFILE = what other people can see: name, username, bio, counts.
// Private details (email, mobile, privacy, namaz settings, password) are in routes/account.js.
const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const User = require('../models/User');
const S = require('../services/social');
const { BIO_MAX } = require('../config/social');

const shape = async (u) => ({
  name: u.name, username: u.username, bio: u.bio || '', isPrivate: !!u.isPrivate, createdAt: u.createdAt,
  social: await S.counts(u._id),
});
const bad = (res, message, status = 400) => res.status(status).json({ message });

router.get('/', auth, safe(async (req, res) => {
  const u = await User.findById(req.userId);
  if (!u) return res.status(404).json({ message: 'Account not found' });
  res.json(await shape(u));
}));

// Edit profile: full name, username, bio
router.put('/', auth, safe(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (name.length < 2 || name.length > 60) return bad(res, 'Full name must be 2 to 60 characters');
  const update = { name };

  if (req.body.username !== undefined) {
    const username = String(req.body.username).trim().toLowerCase();
    const err = S.usernameError(username);
    if (err) return bad(res, err);
    if (await User.findOne({ username, _id: { $ne: req.userId } })) return bad(res, 'This username is already taken', 409);
    update.username = username;
  }
  if (req.body.bio !== undefined) {
    const bio = String(req.body.bio).trim();
    if (bio.length > BIO_MAX) return bad(res, `Bio can be up to ${BIO_MAX} characters`);
    update.bio = bio;
  }
  let u;
  try { u = await User.findByIdAndUpdate(req.userId, update, { new: true }); }
  catch (e) { if (e.code === 11000) return bad(res, 'This username is already taken', 409); throw e; }
  if (!u) return res.status(404).json({ message: 'Account not found' });
  res.json(await shape(u));
}));

module.exports = router;
