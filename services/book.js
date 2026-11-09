// Quran Book: the Quran as 604 pages, like a printed mushaf. A page is downloaded from alquran.cloud the
// first time anyone opens it, saved in MongoDB, and served from there afterwards.
const BookPage = require('../models/BookPage');
const Bookmark = require('../models/Bookmark');
const Surah = require('../models/Surah');
const Ayah = require('../models/Ayah');
const { ensureSurahList, ensureSurah } = require('./quran');
const { PAGES, SURAH_PAGE, JUZ_PAGE, MAX_BOOKMARKS } = require('../config/book');
const { LANGUAGES } = require('../config/quran');
const mushaf = require('./mushaf');
const { DEFAULT_RECITER, audioUrl } = require('../config/audio');

const fail = (msg, status) => Object.assign(new Error(msg), { status: status || 503, expose: true });

// alquran.cloud puts the Bismillah in front of ayah 1. The page shows it as a heading, so cut it off the text.
function splitBismillah(text) {
  const parts = text.split(' ');
  const plain = parts[0].replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
  return plain === 'بسم' && parts.length > 4 ? parts.slice(4).join(' ') : text;
}

async function download(n) {
  let j;
  try {
    const r = await fetch(`https://api.alquran.cloud/v1/page/${n}/quran-uthmani`, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    j = await r.json();
  } catch (e) { throw fail('Could not download this page. Check the server internet connection and try again.'); }
  const list = (j.data && j.data.ayahs) || [];
  if (!list.length) throw fail('This page came back empty. Please try again.');
  const ayahs = list.map((a) => ({
    surah: a.surah.number, number: a.numberInSurah, g: a.number,
    text: a.numberInSurah === 1 && a.surah.number !== 1 && a.surah.number !== 9 ? splitBismillah(a.text) : a.text,
  }));
  const doc = { page: n, juz: list[0].juz, ayahs };
  await BookPage.updateOne({ page: n }, { $set: doc }, { upsert: true });
  return doc;
}

const inflight = {};
async function loadPage(n) {
  const saved = await BookPage.findOne({ page: n }).lean();
  if (saved) return saved;
  if (!inflight[n]) inflight[n] = download(n).finally(() => { delete inflight[n]; });
  return inflight[n];
}

let surahs = null;
async function surahInfo() {
  if (surahs) return surahs;
  await ensureSurahList();
  const rows = await Surah.find().select('number name englishName englishNameTranslation revelationType numberOfAyahs bismillah -_id').lean();
  const o = {};
  rows.forEach((s) => { o[s.number] = s; });
  surahs = o;
  return o;
}

// Everything the client needs to draw page n
async function pageView(n, reciter) {
  const p = await loadPage(n);
  const info = await surahInfo();
  const bism = (await Surah.find({ number: { $in: p.ayahs.filter((a) => a.number === 1).map((a) => a.surah) } }).select('number bismillah').lean());
  const bismOf = {};
  bism.forEach((s) => { bismOf[s.number] = s.bismillah; });
  const ayahs = p.ayahs.map((a) => {
    const starts = a.number === 1;
    return {
      surah: a.surah, number: a.number, key: `${a.surah}:${a.number}`, text: a.text,
      audio: audioUrl(reciter || DEFAULT_RECITER, a.g),
      surahStart: starts ? {
        number: a.surah, name: info[a.surah] && info[a.surah].name, englishName: info[a.surah] && info[a.surah].englishName,
        // Surah 1 has its Bismillah as ayah 1, and surah 9 has none
        bismillah: a.surah === 1 || a.surah === 9 ? null : (bismOf[a.surah] || 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'),
      } : null,
    };
  });
  const first = ayahs[0]; const last = ayahs[ayahs.length - 1];
  return {
    layout: 'text', page: n, pages: PAGES, juz: p.juz, ayahs,
    surahNames: [...new Set(ayahs.map((a) => a.surah))].map((s) => ({ number: s, name: info[s] && info[s].name, englishName: info[s] && info[s].englishName })),
    first: first.key, last: last.key,
    prev: n > 1 ? n - 1 : null, next: n < PAGES ? n + 1 : null,
  };
}

async function index() {
  const info = await surahInfo();
  return {
    pages: PAGES,
    surahs: Object.values(info).sort((a, b) => a.number - b.number).map((s) => ({ number: s.number, name: s.name, englishName: s.englishName, englishNameTranslation: s.englishNameTranslation, ayahs: s.numberOfAyahs, page: SURAH_PAGE[s.number - 1] })),
    juz: JUZ_PAGE.map((page, i) => ({ number: i + 1, page })),
  };
}

// Translation of one ayah. Uses the surah that is already saved for the normal Quran reader.
async function ayahTranslation(surah, number, lang) {
  await ensureSurah(surah);
  if (!LANGUAGES.some((l) => l.code === lang)) { const a = await Ayah.findOne({ surah, number }).select('uthmani indopak').lean(); return { arabic: a ? a.indopak || a.uthmani || null : null, uthmani: a ? a.uthmani || null : null, translation: null }; }
  const a = await Ayah.findOne({ surah, number }).select('tr uthmani indopak').lean();
  return { arabic: a ? a.indopak || a.uthmani || null : null, uthmani: a ? a.uthmani || null : null, translation: (a && a.tr && a.tr[lang]) || null };
}

// The page each surah and juz starts on, for the layout. The print layout may not have it yet (no internet): then bookmarks show no names.
async function startPages(layout) {
  if (layout !== 'print') return { surah: SURAH_PAGE, juz: JUZ_PAGE };
  try { const ix = await mushaf.loadIndex(); return { surah: ix.surahPage, juz: ix.juzPage }; } catch (e) { return { surah: [], juz: [] }; }
}

async function bookmarks(userId, layout) {
  const rows = await Bookmark.find({ user: userId, layout: layout === 'print' ? 'print' : 'text' }).sort({ page: 1 }).lean();
  const info = await surahInfo();
  const start = await startPages(layout);
  // name each bookmark by the surah that starts on or before its page
  const nameFor = (page) => { let s = 0; start.surah.forEach((p, i) => { if (p <= page) s = i + 1; }); return s && info[s] ? info[s].englishName : ''; };
  return rows.map((b) => ({ page: b.page, surah: nameFor(b.page), juz: start.juz.filter((p) => p <= b.page).length || null, savedAt: b.createdAt }));
}

async function addBookmark(userId, page, layout) {
  const lay = layout === 'print' ? 'print' : 'text';
  if ((await Bookmark.countDocuments({ user: userId, layout: lay })) >= MAX_BOOKMARKS) throw fail(`You can keep up to ${MAX_BOOKMARKS} bookmarks. Remove one first.`, 400);
  await Bookmark.updateOne({ user: userId, layout: lay, page }, { $setOnInsert: { user: userId, layout: lay, page } }, { upsert: true });
  return bookmarks(userId, lay);
}
async function removeBookmark(userId, page, layout) {
  const lay = layout === 'print' ? 'print' : 'text';
  await Bookmark.deleteOne({ user: userId, layout: lay, page });
  return bookmarks(userId, lay);
}

const pageViewAny = (layout, n, reciter) => (layout === 'print' ? mushaf.pageView(n, reciter) : pageView(n, reciter));
const indexAny = (layout) => (layout === 'print' ? mushaf.index() : index());

module.exports = { pageView: pageViewAny, index: indexAny, ayahTranslation, bookmarks, addBookmark, removeBookmark };
