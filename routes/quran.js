const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const Surah = require('../models/Surah');
const { ensureSurahList, surahPage, ayahOfTheDay } = require('../services/quran');
const { LANGUAGES, SCRIPTS, PER_PAGE } = require('../config/quran');
const { userNow, dayNumber } = require('../utils/dates');

const int = (v, d, min, max) => { const n = parseInt(v, 10); return isNaN(n) ? d : Math.min(max, Math.max(min, n)); };
const lang = (v) => (v === 'none' || LANGUAGES.some((l) => l.code === v) ? v : 'en');
const script = (v) => (SCRIPTS.some((s) => s.code === v) ? v : 'indopak');

router.get('/surahs', auth, safe(async (req, res) => {
  await ensureSurahList();
  res.json(await Surah.find().sort({ number: 1 }).select('number name englishName englishNameTranslation revelationType numberOfAyahs -_id').lean());
}));

// /api/quran/surah/2?page=1&limit=10&script=indopak&lang=ur
router.get('/surah/:n', auth, safe(async (req, res) => {
  const n = int(req.params.n, 0, 0, 114);
  if (!n) return res.status(400).json({ message: 'Surah number must be 1 to 114' });
  res.json(await surahPage(n, { page: int(req.query.page, 1, 1, 10000), limit: int(req.query.limit, PER_PAGE, 1, 50), script: script(req.query.script), lang: lang(req.query.lang) }));
}));

router.get('/ayah-of-the-day', auth, safe(async (req, res) => {
  const a = await ayahOfTheDay(dayNumber(userNow(req).date), int(req.query.shift, 0, 0, 1000), script(req.query.script), lang(req.query.lang));
  if (!a) return res.status(404).json({ message: 'No ayah saved yet. Run: npm run seed' });
  res.json(a);
}));

module.exports = router;
