const router = require('express').Router();
const auth = require('../middleware/auth');
const safe = require('../utils/safe');
const book = require('../services/book');
const Progress = require('../models/ReadingProgress');
const { RECITERS } = require('../config/audio');
const { LANGUAGES } = require('../config/quran');
const { PAGES, SURAH_PAGE } = require('../config/book');
const print = require('../config/mushaf');

// layout=print: the scanned 15-line Indo-Pak book (610 pages). layout=text: digital Madani text (604 pages, the default for the API).
const layoutOf = (req) => (req.query.layout === 'print' ? 'print' : 'text');
const pagesOf = (layout) => (layout === 'print' ? print.PAGES : PAGES);
const field = (layout) => (layout === 'print' ? 'printPage' : 'page');
const whole = (v, min, max) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : 0; }; // 0 = not valid
const bad = (res, message) => res.status(400).json({ message });
const reciter = (v) => (RECITERS.some((r) => r.code === v) ? v : null);

// Surah list, juz list and the page each one starts on
router.get('/index', auth, safe(async (req, res) => res.json(await book.index(layoutOf(req)))));

// Where the person stopped, their bookmarks and the layout they used last.
router.get('/progress', auth, safe(async (req, res) => {
  const layout = layoutOf(req);
  const row = await Progress.findOne({ user: req.userId }).select('page printPage bookLayout').lean();
  res.json({ layout, page: (row && row[field(layout)]) || 1, lastLayout: (row && row.bookLayout) || 'print', bookmarks: await book.bookmarks(req.userId, layout) });
}));
router.put('/progress', auth, safe(async (req, res) => {
  const layout = layoutOf(req);
  const page = whole(req.body.page, 1, pagesOf(layout));
  if (!page) return bad(res, `Page must be 1 to ${pagesOf(layout)}`);
  await Progress.findOneAndUpdate({ user: req.userId }, { $set: { [field(layout)]: page, bookLayout: layout } }, { upsert: true, setDefaultsOnInsert: true });
  res.json({ page, layout });
}));

router.get('/bookmarks', auth, safe(async (req, res) => res.json(await book.bookmarks(req.userId, layoutOf(req)))));
router.post('/bookmarks', auth, safe(async (req, res) => {
  const layout = layoutOf(req);
  const page = whole(req.body.page, 1, pagesOf(layout));
  if (!page) return bad(res, `Page must be 1 to ${pagesOf(layout)}`);
  res.json(await book.addBookmark(req.userId, page, layout));
}));
router.delete('/bookmarks/:page', auth, safe(async (req, res) => {
  const layout = layoutOf(req);
  const page = whole(req.params.page, 1, pagesOf(layout));
  if (!page) return bad(res, `Page must be 1 to ${pagesOf(layout)}`);
  res.json(await book.removeBookmark(req.userId, page, layout));
}));

// Which page does this surah start on in the text layout? /api/book/locate?surah=18 (the print layout gets this from /index)
router.get('/locate', auth, safe(async (req, res) => {
  const s = whole(req.query.surah, 1, 114);
  if (!s) return bad(res, 'Surah must be 1 to 114');
  res.json({ page: SURAH_PAGE[s - 1] });
}));

// Translation of one ayah, with its Arabic: /api/book/ayah/2/255?lang=en
router.get('/ayah/:surah/:number', auth, safe(async (req, res) => {
  const s = whole(req.params.surah, 1, 114); const n = whole(req.params.number, 1, 286);
  if (!s || !n) return bad(res, 'That surah and ayah do not exist');
  const lang = LANGUAGES.some((l) => l.code === req.query.lang) ? req.query.lang : 'en';
  res.json(await book.ayahTranslation(s, n, lang));
}));

// One page: /api/book/page/50?layout=print&reciter=ar.alafasy   (declared last so it cannot hide the routes above)
router.get('/page/:n', auth, safe(async (req, res) => {
  const layout = layoutOf(req);
  const n = whole(req.params.n, 1, pagesOf(layout));
  if (!n) return bad(res, `Page must be 1 to ${pagesOf(layout)}`);
  res.json(await book.pageView(layout, n, reciter(req.query.reciter)));
}));

module.exports = router;
