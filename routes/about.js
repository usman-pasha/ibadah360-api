const router = require('express').Router();
const auth = require('../middleware/auth');
const About = require('../models/About');

router.get('/', auth, async (req, res) => {
  try {
    const doc = await About.findOne({ key: 'main' }).lean();
    if (!doc) return res.status(404).json({ message: 'About us is not set up yet. Run: npm run seed:about' });
    res.json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Could not load About us' });
  }
});

module.exports = router;
