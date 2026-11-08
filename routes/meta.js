const router = require('express').Router();
const safe = require('../utils/safe');
const { getDefs } = require('../services/content');
const { MADHABS, METHODS, HIJRI_ADJUSTMENTS } = require('../config/options');
const { LANGUAGES, SCRIPTS, PER_PAGE } = require('../config/quran');
const social = require('../config/social');
const { RECITERS } = require('../config/audio');
const { LEVELS } = require('../config/learn');

// App configuration for any client (web, Android, iOS). No login needed.
router.get('/', safe(async (req, res) => {
  const defs = await getDefs();
  const pick = (d) => ({ key: d.key, name: d.name, ar: d.ar, tip: d.tip });
  res.json({
    app: { name: 'Ibadah360', country: 'India' },
    auth: { googleClientId: process.env.GOOGLE_CLIENT_ID || null },
    prayers: defs.fard.map(pick),
    nafl: defs.nafl.map(pick),
    social: { usernameMin: social.USERNAME_MIN, usernameMax: social.USERNAME_MAX, bioMax: social.BIO_MAX, searchMin: social.SEARCH_MIN },
    quran: { languages: LANGUAGES.map(({ code, name, dir }) => ({ code, name, dir })), scripts: SCRIPTS, perPage: PER_PAGE, reciters: RECITERS.map(({ code, name }) => ({ code, name })) },
    learn: { levels: LEVELS },
    settings: {
      madhabs: MADHABS, methods: METHODS, hijriAdjustments: HIJRI_ADJUSTMENTS,
      defaults: { city: 'Bengaluru', state: 'Karnataka', madhab: 'hanafi', method: '1', hijriAdj: -1 },
    },
  });
}));

module.exports = router;
