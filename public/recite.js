/* Recitation practice (experiment). The browser's own speech recognition listens to the student, and this file checks that the
   right words were said in the right order. It does NOT check tajweed rules or how well the letters were pronounced. */
const rc = { rec: null, listening: false, ayah: null, heard: '', ready: false };

const AR_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
function normAr(s) {
  // The Indo-Pak script uses a few different letter shapes (ی ک ہ ے). Turn them into the usual Arabic letters first.
  return String(s).replace(AR_MARKS, '').replace(/[أإآٱ]/g, 'ا').replace(/[\u0649\u06CC\u06D2]/g, 'ي').replace(/\u06A9/g, 'ك').replace(/[\u0629\u06C1\u06C3\u06BE]/g, 'ه')
    .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[^\u0621-\u064A\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// Speech recognition spells things a little differently, so a long word may be one letter off
const sameWord = (a, b) => a === b || (Math.min(a.length, b.length) >= 5 && lev(a, b) <= 1);

// Match the words that were said to the words of the ayah, in order (longest common run)
function compare(expected, said) {
  const n = expected.length; const m = said.length;
  const t = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) t[i][j] = sameWord(expected[i - 1], said[j - 1]) ? t[i - 1][j - 1] + 1 : Math.max(t[i - 1][j], t[i][j - 1]);
  const hit = new Array(n).fill(false);
  let i = n; let j = m;
  while (i > 0 && j > 0) {
    if (sameWord(expected[i - 1], said[j - 1]) && t[i][j] === t[i - 1][j - 1] + 1) { hit[i - 1] = true; i--; j--; }
    else if (t[i - 1][j] >= t[i][j - 1]) i--;
    else j--;
  }
  return hit;
}

function rcShowResult() {
  const a = rc.ayah; const box = $('rcResult');
  box.replaceChildren();
  const said = normAr(rc.heard).split(' ').filter(Boolean);
  if (!said.length) { box.appendChild(mk('p', 'empty', 'I did not hear anything. Check the microphone and try again.')); return; }
  const tokens = a.text.split(/\s+/).filter(Boolean).map((t) => ({ t, n: normAr(t) }));
  const words = tokens.filter((x) => x.n);
  const hit = compare(words.map((w) => w.n), said);
  const right = hit.filter(Boolean).length;
  const pct = Math.round((right / words.length) * 100);
  const line = mk('p', 'rc-line'); line.dir = 'rtl'; line.lang = 'ar';
  let k = 0;
  tokens.forEach((x) => { const s = mk('span', x.n ? (hit[k++] ? 'rc-ok' : 'rc-miss') : '', x.t + ' '); line.appendChild(s); });
  const verdict = pct >= 90 ? 'Masha Allah, excellent!' : pct >= 70 ? 'Good. Try again and watch the red words.' : 'Keep practising. Listen to the ayah first, then try again.';
  box.append(mk('h3', '', `${right} of ${words.length} words matched (${pct}%)`), line, mk('p', 'src', 'Green: heard. Red: missed or unclear.'), mk('p', '', verdict),
    mk('p', 'src', 'What the browser heard: ' + rc.heard),
    askBtn(`I practised reciting ayah ${a.key}. Give me tajweed tips for reciting it correctly, word by word.`));
}

function rcStop() {
  if (rc.rec && rc.listening) rc.rec.stop();
}
function rcStart() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('This browser cannot listen to speech. Use Chrome or Edge.', true); return; }
  if (!rc.ayah) { toast('Load an ayah first', true); return; }
  const r = new SR();
  r.lang = 'ar-SA'; r.continuous = true; r.interimResults = true;
  rc.heard = '';
  r.onresult = (e) => {
    let text = '';
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + ' ';
    rc.heard = text.trim();
    $('rcLive').textContent = rc.heard;
  };
  r.onerror = (e) => {
    const msg = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Microphone is blocked. Allow it in the browser, and use https or localhost.' : e.error === 'no-speech' ? 'I did not hear anything.' : 'Voice recognition problem: ' + e.error;
    toast(msg, true);
  };
  r.onend = () => { rc.listening = false; $('rcMic').textContent = '🎤 Start reciting'; $('rcMic').classList.remove('on'); if (rc.heard) rcShowResult(); };
  rc.rec = r; rc.listening = true;
  $('rcResult').replaceChildren(); $('rcLive').textContent = 'Listening…';
  $('rcMic').textContent = '■ Stop and check'; $('rcMic').classList.add('on');
  try { r.start(); } catch (e) { rc.listening = false; toast('Could not start the microphone', true); }
}

async function rcLoadAyah() {
  const s = Number($('rcSurah').value); const n = Number($('rcAyah').value);
  const max = (qSurahs.find((x) => x.number === s) || {}).numberOfAyahs || 1;
  if (!Number.isInteger(n) || n < 1 || n > max) { toast(`Surah ${s} has ayahs 1 to ${max}`, true); return; }
  try {
    const r = await api(`/book/ayah/${s}/${n}?lang=en`);
    rc.ayah = { key: `${s}:${n}`, text: r.arabic || r.uthmani || '' };
    const p = mk('p', 'ayah-ar indopak', rc.ayah.text); p.lang = 'ar'; p.dir = 'rtl';
    $('rcAyahBox').replaceChildren(p, mk('p', 'src', `Ayah ${rc.ayah.key}`));
    $('rcResult').replaceChildren(); $('rcLive').textContent = '';
    $('rcMic').disabled = false;
  } catch (e) { toast(e.message, true); }
}

async function loadRecite() {
  if (!rc.ready) {
    if (!qSurahs) qSurahs = await api('/quran/surahs');
    fillSelect($('rcSurah'), qSurahs.map((s) => [s.number, `${s.number}. ${s.englishName} (${s.name})`]), 1);
    $('rcSurah').onchange = () => { $('rcAyah').value = 1; };
    $('rcLoad').onclick = rcLoadAyah;
    $('rcMic').onclick = () => (rc.listening ? rcStop() : rcStart());
    const ok = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    $('rcSupport').classList.toggle('hidden', ok);
    rc.ready = true;
  }
}
