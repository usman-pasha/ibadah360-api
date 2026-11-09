// Run once after setup:  npm run check:mushaf
// Checks that quran.com's "Indopak 15 lines" list matches the scanned book (needs internet, no database).
const { PAGES, QURAN_COM_MUSHAF, ANCHORS } = require('../config/mushaf');
const API = 'https://api.quran.com/api/v4';
const get = async (url) => { const r = await fetch(url, { signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url); return r.json(); };

(async () => {
  let bad = 0;
  console.log(`Checking quran.com mushaf ${QURAN_COM_MUSHAF} against the scanned book (${PAGES} pages)...`);
  for (const [page, expected] of Object.entries(ANCHORS)) {
    const j = await get(`${API}/verses/by_page/${page}?mushaf=${QURAN_COM_MUSHAF}&per_page=50&fields=verse_key`);
    const first = j.verses && j.verses[0] && j.verses[0].verse_key;
    const ok = first === expected;
    if (!ok) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  page ${page} starts at ${first} (the scanned book starts it at ${expected})`);
  }
  const last = await get(`${API}/verses/by_chapter/114?mushaf=${QURAN_COM_MUSHAF}&per_page=1&page=1`);
  const p114 = last.verses && last.verses[0] && last.verses[0].page_number;
  console.log(`${p114 === PAGES ? 'PASS' : 'FAIL'}  surah 114 starts on page ${p114} (the scanned book has ${PAGES} pages)`);
  if (p114 !== PAGES) bad++;
  console.log(bad ? '\nSome checks failed. Do not use the Print layout until they pass (see config/mushaf.js).' : '\nAll checks passed. The Print layout lines up with the scanned pages.');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('Could not check:', e.message); process.exit(1); });
