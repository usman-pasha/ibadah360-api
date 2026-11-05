const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const Surah = require('../models/Surah');
const Progress = require('../models/ReadingProgress');
const { ensureSurahList, surahPage, ayahOfTheDay } = require('../services/quran');
const para = require('../services/para');
const readlog = require('../services/readlog');
const { LANGUAGES, SCRIPTS, PER_PAGE } = require('../config/quran');
const { RECITERS } = require('../config/audio');
const { userNow, dayNumber } = require('../utils/dates');

const int = (v, d, min, max) => { const n = parseInt(v, 10); return isNaN(n) ? d : Math.min(max, Math.max(min, n)); };
const num = (v, max) => { const n = parseInt(v, 10); return Number.isInteger(n) && n >= 1 && n <= max ? n : 0; }; // 0 = not valid
const lang = (v) => (v === 'none' || LANGUAGES.some((l) => l.code === v) ? v : 'en');
const script = (v) => (SCRIPTS.some((s) => s.code === v) ? v : 'indopak');
const reciter = (v) => (RECITERS.some((r) => r.code === v) ? v : null); // null = the default reciter
const bad = (res, message) => res.status(400).json({ message });

router.get('/surahs', auth, safe(async (req, res) => {
  await ensureSurahList();
  res.json(await Surah.find().sort({ number: 1 }).select('number name englishName englishNameTranslation revelationType numberOfAyahs -_id').lean());
}));

// /api/quran/surah/2?page=1&limit=10&script=indopak&lang=ur&reciter=ar.alafasy   (or at=150 to open the page holding ayah 150)
router.get('/surah/:n', auth, safe(async (req, res) => {
  const n = num(req.params.n, 114);
  if (!n) return bad(res, 'Surah number must be 1 to 114');
  res.json(await surahPage(n, { page: int(req.query.page, 1, 1, 10000), limit: int(req.query.limit, PER_PAGE, 1, 50), at: int(req.query.at, 0, 0, 286), script: script(req.query.script), lang: lang(req.query.lang), reciter: reciter(req.query.reciter) }));
}));

router.get('/paras', auth, safe(async (req, res) => res.json(await para.listParas())));

// /api/quran/para/5?page=1&limit=10&script=indopak&lang=ur   (or at=4:30 to open the page holding that ayah)
router.get('/para/:n', auth, safe(async (req, res) => {
  const n = num(req.params.n, 30);
  if (!n) return bad(res, 'Para number must be 1 to 30');
  res.json(await para.paraPage(n, { page: int(req.query.page, 1, 1, 10000), limit: int(req.query.limit, PER_PAGE, 1, 50), at: /^\d+:\d+$/.test(req.query.at || '') ? req.query.at : null, script: script(req.query.script), lang: lang(req.query.lang), reciter: reciter(req.query.reciter) }));
}));

// Which para holds this ayah?
router.get('/locate', auth, safe(async (req, res) => {
  const s = num(req.query.surah, 114);
  const a = num(req.query.ayah, 286);
  if (!s || !a) return bad(res, 'Give surah and ayah');
  res.json({ para: await para.locate(s, a) });
}));

/* ---------- where the person stopped, what they read, and their reading choices ---------- */
// read = [{ surah, from, to }]: ayahs that were read. At most 60 at a time.
function readRanges(list, count) {
  if (!Array.isArray(list) || list.length > 12) return null;
  const out = [];
  let total = 0;
  for (const r of list) {
    const s = Number(r && r.surah); const f = Number(r && r.from); const t = Number(r && r.to);
    if (![s, f, t].every(Number.isInteger) || s < 1 || s > 114 || f < 1 || t < f || t > count[s]) return null;
    total += t - f + 1;
    out.push({ surah: s, from: f, to: t });
  }
  return total <= 60 ? out : null;
}

router.get('/progress', auth, safe(async (req, res) => res.json(await readlog.progressView(req.userId))));

router.put('/progress', auth, safe(async (req, res) => {
  const b = req.body;
  const set = {};
  const { count } = await para.getRanges();
  if (b.mode !== undefined) { if (!['para', 'surah'].includes(b.mode)) return bad(res, 'Mode must be para or surah'); set.mode = b.mode; }
  if (b.surah !== undefined || b.ayah !== undefined) {
    const s = Number(b.surah); const a = Number(b.ayah);
    if (!Number.isInteger(s) || s < 1 || s > 114 || !Number.isInteger(a) || a < 1 || a > count[s]) return bad(res, 'That surah and ayah do not exist');
    set.surah = s; set.ayah = a;
  }
  if (b.script !== undefined) { if (!SCRIPTS.some((x) => x.code === b.script)) return bad(res, 'Unknown script'); set.script = b.script; }
  if (b.lang !== undefined) { if (!(b.lang === 'none' || LANGUAGES.some((l) => l.code === b.lang))) return bad(res, 'Unknown translation'); set.lang = b.lang; }
  if (b.size !== undefined) { const z = Number(b.size); if (!(z >= 1.1 && z <= 3)) return bad(res, 'Text size must be between 1.1 and 3'); set.size = z; }
  if (b.reciter !== undefined) { if (!reciter(b.reciter)) return bad(res, 'Unknown reciter'); set.reciter = b.reciter; }
  if (b.autoNext !== undefined) { if (typeof b.autoNext !== 'boolean') return bad(res, 'autoNext must be true or false'); set.autoNext = b.autoNext; }
  let ranges = [];
  if (b.read !== undefined) { ranges = readRanges(b.read, count); if (!ranges) return bad(res, 'Those ayahs do not exist, or too many at once'); }

  if (Object.keys(set).length) await Progress.findOneAndUpdate({ user: req.userId }, { $set: set }, { upsert: true, new: true, setDefaultsOnInsert: true });
  const marked = await readlog.markRead(req.userId, userNow(req).date, ranges);
  res.json({ ...(await readlog.progressView(req.userId)), marked });
}));

router.get('/ayah-of-the-day', auth, safe(async (req, res) => {
  const a = await ayahOfTheDay(dayNumber(userNow(req).date), int(req.query.shift, 0, 0, 1000), script(req.query.script), lang(req.query.lang), reciter(req.query.reciter));
  if (!a) return res.status(404).json({ message: 'No ayah saved yet. Run: npm run seed' });
  res.json(a);
}));

module.exports = router;
