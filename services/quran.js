// The Quran is stored in MongoDB. Each surah is downloaded once (from alquran.cloud and quran.com),
// saved, and then served from the database. `npm run seed:quran` downloads all 114 surahs in advance.
const Surah = require('../models/Surah');
const Ayah = require('../models/Ayah');
const DailyAyah = require('../models/DailyAyah');
const { LANGUAGES } = require('../config/quran');

const BASE = 'https://api.alquran.cloud/v1';
const TEN_MIN = 10 * 60 * 1000;

async function getJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' from ' + url);
  return r.json();
}
const fail = (msg) => Object.assign(new Error(msg), { status: 503, expose: true });

// alquran.cloud puts the Bismillah in front of ayah 1 of most surahs. Keep it separate.
function splitBismillah(text) {
  const parts = text.split(' ');
  const plain = parts[0].replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
  if (plain === 'بسم' && parts.length > 4) return { bism: parts.slice(0, 4).join(' '), rest: parts.slice(4).join(' ') };
  return { bism: null, rest: text };
}

async function ensureSurahList() {
  if ((await Surah.estimatedDocumentCount()) >= 114) return;
  let j;
  try { j = await getJson(`${BASE}/surah`); } catch (e) { throw fail('Could not download the surah list. Check the server internet connection.'); }
  await Surah.bulkWrite(j.data.map((s) => ({
    updateOne: {
      filter: { number: s.number },
      update: { $set: { name: s.name, englishName: s.englishName, englishNameTranslation: s.englishNameTranslation, revelationType: s.revelationType, numberOfAyahs: s.numberOfAyahs } },
      upsert: true,
    },
  })));
}

async function load(n) {
  await ensureSurahList();
  const s = await Surah.findOne({ number: n });
  if (!s) return null;
  const retry = !s.tried || Date.now() - s.tried > TEN_MIN;
  if (s.loaded.uthmani && s.loaded.tr && s.loaded.indopak) return s;
  if (s.loaded.uthmani && !retry) return s;
  s.tried = new Date();

  if (!s.loaded.uthmani || !s.loaded.tr) {
    const get = (ed) => getJson(`${BASE}/surah/${n}/${ed}`).then((j) => j.data.ayahs);
    const res = await Promise.allSettled(['quran-uthmani', ...LANGUAGES.map((l) => l.edition)].map(get));
    const rows = {};
    res.forEach((r, k) => {
      if (r.status !== 'fulfilled') return console.error(`Surah ${n}: download ${k === 0 ? 'of Arabic' : 'of ' + LANGUAGES[k - 1].code} failed`);
      r.value.forEach((a) => {
        const row = rows[a.numberInSurah] || (rows[a.numberInSurah] = {});
        if (k === 0) {
          const sp = n !== 1 && n !== 9 && a.numberInSurah === 1 ? splitBismillah(a.text) : { bism: null, rest: a.text };
          row.uthmani = sp.rest;
          if (sp.bism) s.bismillah = sp.bism;
        } else row['tr.' + LANGUAGES[k - 1].code] = a.text;
      });
    });
    const ops = Object.entries(rows).map(([num, $set]) => ({ updateOne: { filter: { surah: n, number: Number(num) }, update: { $set }, upsert: true } }));
    if (ops.length) await Ayah.bulkWrite(ops);
    if (res[0].status === 'fulfilled') s.loaded.uthmani = true;
    if (res.every((r) => r.status === 'fulfilled')) s.loaded.tr = true;
  }

  if (!s.loaded.indopak) {
    try {
      const j = await getJson(`https://api.quran.com/api/v4/quran/verses/indopak?chapter_number=${n}`);
      const ops = j.verses.map((v) => ({ updateOne: { filter: { surah: n, number: Number(v.verse_key.split(':')[1]) }, update: { $set: { indopak: v.text_indopak } } } }));
      if (!ops.length) throw new Error('empty');
      await Ayah.bulkWrite(ops);
      s.loaded.indopak = true;
    } catch (e) { console.error(`Surah ${n}: Indo-Pak script download failed (${e.message})`); }
  }
  await s.save();
  if (!s.loaded.uthmani) throw fail('Could not download this surah. Check the server internet connection and try again.');
  return s;
}

const inflight = {};
function ensureSurah(n) {
  if (!inflight[n]) inflight[n] = load(n).finally(() => { delete inflight[n]; });
  return inflight[n];
}

async function surahPage(n, { page, limit, script, lang }) {
  const s = await ensureSurah(n);
  if (!s) return null;
  const pages = Math.max(1, Math.ceil(s.numberOfAyahs / limit));
  const p = Math.min(Math.max(1, page), pages);
  const docs = await Ayah.find({ surah: n }).sort({ number: 1 }).skip((p - 1) * limit).limit(limit).lean();
  const useIp = script === 'indopak' && s.loaded.indopak;
  return {
    surah: { number: s.number, name: s.name, englishName: s.englishName, englishNameTranslation: s.englishNameTranslation, revelationType: s.revelationType, numberOfAyahs: s.numberOfAyahs, bismillah: s.bismillah || null },
    script: useIp ? 'indopak' : 'uthmani', scriptFallback: script === 'indopak' && !useIp,
    language: lang, translationMissing: lang !== 'none' && docs.some((a) => !(a.tr && a.tr[lang])),
    page: p, pages, limit, total: s.numberOfAyahs,
    ayahs: docs.map((a) => ({ number: a.number, key: `${n}:${a.number}`, arabic: useIp && a.indopak ? a.indopak : a.uthmani, translation: lang === 'none' ? null : (a.tr && a.tr[lang]) || null })),
  };
}

async function ayahOfTheDay(dayNumber, shift, script, lang) {
  const refs = await DailyAyah.find().sort({ order: 1 }).lean();
  if (!refs.length) return null;
  const ref = refs[(((dayNumber + shift) % refs.length) + refs.length) % refs.length];
  const s = await ensureSurah(ref.surah);
  const a = await Ayah.findOne({ surah: ref.surah, number: ref.ayah }).lean();
  if (!a) return null;
  const useIp = script === 'indopak' && s.loaded.indopak && a.indopak;
  return {
    key: `${ref.surah}:${ref.ayah}`, surah: { number: s.number, name: s.name, englishName: s.englishName }, number: ref.ayah,
    script: useIp ? 'indopak' : 'uthmani', arabic: useIp ? a.indopak : a.uthmani,
    language: lang, translation: lang === 'none' ? null : (a.tr && a.tr[lang]) || null,
  };
}

module.exports = { ensureSurahList, ensureSurah, surahPage, ayahOfTheDay };
