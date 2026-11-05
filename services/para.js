// Reading the Quran by para (juz). A para runs across surahs, so a page of a para can contain the end of one
// surah and the start of the next. Only the surahs on the requested page are loaded (downloaded once, then saved).
const Para = require('../models/Para');
const Surah = require('../models/Surah');
const Ayah = require('../models/Ayah');
const { ensureSurahList, ensureSurah, shapeAyah, getOffsets, audioFor } = require('./quran');

let cache = null;
let cacheAt = 0;

async function getRanges() {
  if (cache && Date.now() - cacheAt < 5 * 60 * 1000) return cache;
  await ensureSurahList();
  const [paras, surahs] = await Promise.all([
    Para.find().sort({ number: 1 }).lean(),
    Surah.find().sort({ number: 1 }).select('number englishName numberOfAyahs').lean(),
  ]);
  if (!paras.length) throw Object.assign(new Error('The paras are not saved yet. Run: npm run seed'), { status: 503, expose: true });
  const count = {};
  const name = {};
  surahs.forEach((s) => { count[s.number] = s.numberOfAyahs; name[s.number] = s.englishName; });
  const before = (s, a) => (a > 1 ? [s, a - 1] : [s - 1, count[s - 1]]);
  const list = paras.map((p, i) => {
    const end = i < paras.length - 1 ? before(paras[i + 1].startSurah, paras[i + 1].startAyah) : [114, count[114]];
    const segments = [];
    for (let s = p.startSurah; s <= end[0]; s++) {
      const from = s === p.startSurah ? p.startAyah : 1;
      const to = s === end[0] ? end[1] : count[s];
      segments.push({ surah: s, from, to, count: to - from + 1 });
    }
    return {
      number: p.number, name: p.name,
      start: { surah: p.startSurah, ayah: p.startAyah, surahName: name[p.startSurah] },
      end: { surah: end[0], ayah: end[1], surahName: name[end[0]] },
      segments, ayahCount: segments.reduce((n, x) => n + x.count, 0),
    };
  });
  cache = { list, count, name };
  cacheAt = Date.now();
  return cache;
}

const listParas = async () => (await getRanges()).list.map(({ segments, ...p }) => p);

// Which para holds this ayah?
async function locate(surah, ayah) {
  const { list } = await getRanges();
  for (let i = list.length - 1; i >= 0; i--) {
    const st = list[i].start;
    if (surah > st.surah || (surah === st.surah && ayah >= st.ayah)) return list[i].number;
  }
  return 1;
}

function indexIn(para, surah, ayah) {
  let idx = 0;
  for (const seg of para.segments) {
    if (seg.surah === surah && ayah >= seg.from && ayah <= seg.to) return idx + (ayah - seg.from);
    idx += seg.ayahCount !== undefined ? seg.ayahCount : seg.count;
  }
  return -1;
}

// at = "surah:ayah": open the page that holds that ayah
async function paraPage(n, { page, limit, at, script, lang, reciter }) {
  const { list } = await getRanges();
  const para = list[n - 1];
  if (!para) return null;
  const pages = Math.max(1, Math.ceil(para.ayahCount / limit));
  let p = page;
  if (at) {
    const [s, a] = String(at).split(':').map(Number);
    const idx = indexIn(para, s, a);
    if (idx >= 0) p = Math.floor(idx / limit) + 1;
  }
  p = Math.min(pages, Math.max(1, p));

  // the ayahs of this page, walking through the surahs of the para
  const refs = [];
  let skip = (p - 1) * limit;
  for (const seg of para.segments) {
    if (skip >= seg.count) { skip -= seg.count; continue; }
    for (let a = seg.from + skip; a <= seg.to && refs.length < limit; a++) refs.push({ surah: seg.surah, number: a });
    skip = 0;
    if (refs.length >= limit) break;
  }

  const wanted = {};
  refs.forEach((r) => { (wanted[r.surah] = wanted[r.surah] || []).push(r.number); });
  const surahDocs = {};
  const ayahDocs = {};
  for (const s of Object.keys(wanted)) {
    surahDocs[s] = await ensureSurah(Number(s));
    const nums = wanted[s];
    const rows = await Ayah.find({ surah: Number(s), number: { $gte: Math.min(...nums), $lte: Math.max(...nums) } }).sort({ number: 1 }).lean();
    ayahDocs[s] = Object.fromEntries(rows.map((r) => [r.number, r]));
  }
  const useIp = script === 'indopak' && Object.values(surahDocs).every((s) => s.loaded.indopak);
  const offs = await getOffsets();
  const ayahs = refs.map((r) => shapeAyah(surahDocs[r.surah], ayahDocs[r.surah][r.number] || { number: r.number, uthmani: '' }, useIp, lang, audioFor(reciter, offs[r.surah] || 0, r.number)));
  return {
    para: { number: para.number, name: para.name, start: para.start, end: para.end, ayahCount: para.ayahCount },
    script: useIp ? 'indopak' : 'uthmani', scriptFallback: script === 'indopak' && !useIp,
    language: lang, translationMissing: lang !== 'none' && ayahs.some((a) => !a.translation),
    page: p, pages, limit, total: para.ayahCount, ayahs,
  };
}

module.exports = { getRanges, listParas, locate, paraPage };
