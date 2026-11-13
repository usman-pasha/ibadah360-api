const router = require('express').Router();
const auth = require('../middleware/auth');
const hadith = require('../config/hadith');
const names = require('../config/names');
const { userNow, dayNumber } = require('../utils/dates');

const pick = (list, date, shift) => { const i = (((dayNumber(date) + shift) % list.length) + list.length) % list.length; return { index: i + 1, total: list.length, item: list[i] }; };
const shiftOf = (v) => { const n = parseInt(v, 10); return Number.isInteger(n) ? Math.max(-365, Math.min(365, n)) : 0; };

// Hadith of the day. shift moves to another day: /api/wisdom/hadith?shift=1
router.get('/hadith', auth, (req, res) => {
  const h = pick(hadith, userNow(req).date, shiftOf(req.query.shift));
  res.json({ index: h.index, total: h.total, ...h.item });
});

const asName = (n, i) => ({ number: i + 1, ar: n[0], tr: n[1], en: n[2] });
// All 99 Names
router.get('/names', auth, (req, res) => res.json({ names: names.map(asName), note: 'Scholars list the Names slightly differently. This is the widely used list.' }));
// Name of the day
router.get('/names/today', auth, (req, res) => { const p = pick(names, userNow(req).date, shiftOf(req.query.shift)); res.json(asName(p.item, p.index - 1)); });

module.exports = router;
