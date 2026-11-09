// Print layout (scanned 15-line Indo-Pak Quran). Which ayahs are on each of the 610 page pictures.
// The list comes from quran.com once per page, is checked, and is saved in MongoDB.
const MushafPage = require('../models/MushafPage');
const MushafIndex = require('../models/MushafIndex');
const Surah = require('../models/Surah');
const { ensureSurahList, getOffsets, audioFor } = require('./quran');
const { PAGES, QURAN_COM_MUSHAF, ANCHORS, IMAGE } = require('../config/mushaf');

const API = 'https://api.quran.com/api/v4';
const fail = (msg) => Object.assign(new Error(msg), { status: 503, expose: true });
const keyOf = (k) => k.split(':').map(Number);

async function getJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// ayah 7 of surah 1 is followed by 2:1, so the last key of one page is one step before the first key of the next
const counts = {};
async function ayahCount(s) {
  if (!counts[s]) { await ensureSurahList(); (await Surah.find().select('number numberOfAyahs').lean()).forEach((x) => { counts[x.number] = x.numberOfAyahs; }); }
  return counts[s];
}
async function follows(prevLast, nextFirst) {
  const [ps, pa] = keyOf(prevLast); const [ns, na] = keyOf(nextFirst);
  return ns === ps && na === pa + 1 || (ns === ps + 1 && na === 1 && pa === (await ayahCount(ps)));
}

async function download(n) {
  let keys;
  try {
    const j = await getJson(`${API}/verses/by_page/${n}?mushaf=${QURAN_COM_MUSHAF}&per_page=50&fields=verse_key`);
    keys = (j.verses || []).map((v) => v.verse_key).filter((k) => /^\d+:\d+$/.test(k));
  } catch (e) { throw fail('Could not download this page list. Check the server internet connection and try again.'); }
  if (!keys.length) throw fail('This page list came back empty. Please try again.');
  // The page must agree with what is printed in the scanned book, or the audio and read counts would be wrong
  if (ANCHORS[n] && keys[0] !== ANCHORS[n]) {
    console.error(`Print layout: page ${n} starts at ${keys[0]} but the scanned book starts it at ${ANCHORS[n]}. Check QURAN_COM_MUSHAF in config/mushaf.js.`);
    throw fail('The downloaded page list does not match this book, so it was not used. See the server terminal.');
  }
  for (const [m, expected] of [[n - 1, true], [n + 1, false]]) {
    const other = m >= 1 && m <= PAGES ? await MushafPage.findOne({ page: m }).lean() : null;
    if (!other) continue;
    const ok = expected ? await follows(other.keys[other.keys.length - 1], keys[0]) : await follows(keys[keys.length - 1], other.keys[0]);
    if (!ok) { console.error(`Print layout: page ${n} does not join up with page ${m}.`); throw fail('The downloaded page list does not join up with the next page, so it was not used. See the server terminal.'); }
  }
  await MushafPage.updateOne({ page: n }, { $set: { page: n, keys } }, { upsert: true });
  return { page: n, keys };
}

const inflight = {};
async function loadPage(n) {
  const saved = await MushafPage.findOne({ page: n }).lean();
  if (saved) return saved;
  if (!inflight[n]) inflight[n] = download(n).finally(() => { delete inflight[n]; });
  return inflight[n];
}

async function pageView(n, reciter) {
  const p = await loadPage(n);
  const offsets = await getOffsets();
  const names = {};
  (await Surah.find().select('number name englishName -_id').lean()).forEach((s) => { names[s.number] = s; });
  const ayahs = p.keys.map((k) => {
    const [s, a] = keyOf(k);
    return { surah: s, number: a, key: k, audio: audioFor(reciter, offsets[s], a) };
  });
  const surahs = [...new Set(ayahs.map((a) => a.surah))];
  return {
    layout: 'print', page: n, pages: PAGES, image: IMAGE(n), ayahs,
    surahNames: surahs.map((s) => ({ number: s, name: names[s] && names[s].name, englishName: names[s] && names[s].englishName })),
    first: ayahs[0].key, last: ayahs[ayahs.length - 1].key,
    prev: n > 1 ? n - 1 : null, next: n < PAGES ? n + 1 : null,
  };
}

// The page each surah and juz starts on. quran.com gives the page of a verse, so ask for the first verse of each.
async function buildIndex() {
  const out = { surahPage: [], juzPage: [] };
  const ask = async (url) => { const j = await getJson(url); const v = j.verses && j.verses[0]; if (!v || !Number.isInteger(v.page_number)) throw new Error('no page number'); return v.page_number; };
  const run = async (list, fn) => { for (let i = 0; i < list.length; i += 8) await Promise.all(list.slice(i, i + 8).map(fn)); };
  const surahs = Array.from({ length: 114 }, (_, i) => i + 1);
  const juz = Array.from({ length: 30 }, (_, i) => i + 1);
  try {
    await run(surahs, async (s) => { out.surahPage[s - 1] = await ask(`${API}/verses/by_chapter/${s}?mushaf=${QURAN_COM_MUSHAF}&per_page=1&page=1`); });
    await run(juz, async (j) => { out.juzPage[j - 1] = await ask(`${API}/verses/by_juz/${j}?mushaf=${QURAN_COM_MUSHAF}&per_page=1&page=1`); });
  } catch (e) { throw fail('Could not download the surah and juz pages. Check the server internet connection and try again.'); }
  const good = (a, n) => a.length === n && a.every((p, i) => Number.isInteger(p) && p >= 1 && p <= PAGES && (i === 0 || p >= a[i - 1]));
  if (!good(out.surahPage, 114) || !good(out.juzPage, 30) || out.surahPage[0] !== 1 || out.surahPage[1] !== 2 || out.surahPage[112] !== 610) throw fail('The surah pages did not match this book, so they were not used. See the server terminal.');
  await MushafIndex.updateOne({ key: 'print' }, { $set: out }, { upsert: true });
  return out;
}
let idxInflight = null;
async function loadIndex() {
  const saved = await MushafIndex.findOne({ key: 'print' }).lean();
  if (saved) return saved;
  if (!idxInflight) idxInflight = buildIndex().finally(() => { idxInflight = null; });
  return idxInflight;
}

async function index() {
  const [ix] = await Promise.all([loadIndex(), ensureSurahList()]);
  const rows = await Surah.find().sort({ number: 1 }).select('number name englishName englishNameTranslation numberOfAyahs -_id').lean();
  return {
    layout: 'print', pages: PAGES,
    surahs: rows.map((s) => ({ number: s.number, name: s.name, englishName: s.englishName, englishNameTranslation: s.englishNameTranslation, ayahs: s.numberOfAyahs, page: ix.surahPage[s.number - 1] })),
    juz: ix.juzPage.map((page, i) => ({ number: i + 1, page })),
  };
}

module.exports = { pageView, index, loadIndex };
