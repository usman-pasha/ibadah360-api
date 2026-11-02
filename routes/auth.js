const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');
const { sendMail } = require('../utils/mailer');
const { cleanPhone } = require('../utils/validate');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

const makeToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(400).json({ message: 'This email is already registered' });

    const phone = cleanPhone(req.body.phone);
    if (phone === null) return res.status(400).json({ message: 'Enter a valid Indian mobile number (10 digits starting with 6 to 9)' });
    const user = await User.create({ name, email, phone, password: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: makeToken(user), name: user.name });
  } catch (e) {
    res.status(500).json({ message: 'Could not register. Try again' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(password || '', user.password)))
      return res.status(400).json({ message: 'Email or password is wrong' });
    res.json({ token: makeToken(user), name: user.name });
  } catch (e) {
    res.status(500).json({ message: 'Could not log in. Try again' });
  }
});

// Forgot password: always answers the same way, so nobody can test which emails exist.
router.post('/forgot', async (req, res) => {
  const reply = { message: 'If this email is registered, a reset link has been sent. It is valid for 30 minutes.' };
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const user = email ? await User.findOne({ email }) : null;
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetTokenHash = sha256(token);
      user.resetExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      const base = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
      await sendMail({
        to: user.email,
        subject: 'Reset your Ibadah360 password',
        text: `Hello ${user.name},\n\nOpen this link to choose a new password. It is valid for 30 minutes:\n${base}/reset.html?token=${token}\n\nIf you did not ask for this, you can ignore this email.`,
      });
    }
  } catch (e) {
    console.error('Forgot password error:', e.message);
  }
  res.json(reply);
});

router.post('/reset', async (req, res) => {
  try {
    const token = String(req.body.token || '');
    const password = String(req.body.password || '');
    if (!token || password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const user = await User.findOne({ resetTokenHash: sha256(token), resetExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: 'This reset link is invalid or has expired' });
    user.password = await bcrypt.hash(password, 10);
    user.resetTokenHash = undefined;
    user.resetExpires = undefined;
    await user.save();
    res.json({ message: 'Password changed. Taking you to log in...' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Could not reset the password. Try again' });
  }
});

module.exports = router;
