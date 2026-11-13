/* AI Teacher voice: speak your question and hear the answer read aloud, in many languages.
   This uses the speech features built into the browser and the phone or computer (nothing is sent to our server).
   Which languages work depends on the device: it needs a speech voice for that language. */
const tv = { rec: null, listening: false, speaking: false, queue: [], gen: 0, talk: false, misses: 0, gotText: false, ready: false };

const TV_LANGS = [
  ['en-IN', 'English (India)'], ['en-US', 'English (US)'], ['ur-PK', 'Urdu (اردو)'], ['hi-IN', 'Hindi (हिन्दी)'], ['kn-IN', 'Kannada (ಕನ್ನಡ)'],
  ['ar-SA', 'Arabic (العربية)'], ['ta-IN', 'Tamil (தமிழ்)'], ['te-IN', 'Telugu (తెలుగు)'], ['ml-IN', 'Malayalam (മലയാളം)'], ['bn-IN', 'Bengali (বাংলা)'],
  ['mr-IN', 'Marathi (मराठी)'], ['gu-IN', 'Gujarati (ગુજરાતી)'], ['pa-IN', 'Punjabi (ਪੰਜਾਬੀ)'], ['fa-IR', 'Persian (فارسی)'], ['tr-TR', 'Turkish'],
  ['id-ID', 'Indonesian'], ['ms-MY', 'Malay'], ['fr-FR', 'French'], ['es-ES', 'Spanish'], ['de-DE', 'German'],
];
const TV_NAME = Object.fromEntries(TV_LANGS.map(([c, n]) => [c.split('-')[0], n.replace(/ \(.*\)/, '')]));
const TV_LATIN = ['en', 'fr', 'es', 'de', 'tr', 'id', 'ms']; // languages written in Latin letters

/* ---------- which language is this piece of text? (by its letters) ---------- */
const TV_URDU_LETTERS = /[\u0679\u0688\u0691\u06BA\u06D2\u06BE\u06C1\u06AF\u0686\u067E\u0698\u06A9\u06CC]/; // letters Urdu uses and Arabic does not
function tvScript(ch) {
  const c = ch.codePointAt(0);
  if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || (c >= 0xc0 && c <= 0x24f)) return 'latin';
  if ((c >= 0x600 && c <= 0x6ff) || (c >= 0x750 && c <= 0x77f) || (c >= 0xfb50 && c <= 0xfdff) || (c >= 0xfe70 && c <= 0xfeff)) return /[\u064B-\u065F\u0670\u0640\u060C\u061B\u061F\u06D4]/.test(ch) ? null : 'arabic'; // marks and punctuation follow the letters before them
  if (c >= 0x900 && c <= 0x97f) return c === 0x964 || c === 0x965 ? null : 'hi';
  if (c >= 0x980 && c <= 0x9ff) return 'bn';
  if (c >= 0xa00 && c <= 0xa7f) return 'pa';
  if (c >= 0xa80 && c <= 0xaff) return 'gu';
  if (c >= 0xb80 && c <= 0xbff) return 'ta';
  if (c >= 0xc00 && c <= 0xc7f) return 'te';
  if (c >= 0xc80 && c <= 0xcff) return 'kn';
  if (c >= 0xd00 && c <= 0xd7f) return 'ml';
  return null; // digits, spaces, punctuation: they join the text around them
}
const TV_CODE = { hi: 'hi-IN', bn: 'bn-IN', pa: 'pa-IN', gu: 'gu-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN' };

// Cuts a text into pieces that each use one writing system, so English, Arabic and Urdu parts are each read by the right voice.
function tvSegments(text, latinLang) {
  const runs = []; let pending = ''; let cur = null;
  for (const ch of text) {
    const s = tvScript(ch);
    if (s === null) { if (cur) cur.text += ch; else pending += ch; continue; }
    if (cur && cur.script === s) cur.text += ch;
    else { cur = { script: s, text: pending + ch }; pending = ''; runs.push(cur); }
  }
  if (pending.trim() && runs.length) runs[runs.length - 1].text += pending;
  return runs.map((r) => ({ lang: r.script === 'latin' ? latinLang : r.script === 'arabic' ? (TV_URDU_LETTERS.test(r.text) ? 'ur-PK' : 'ar-SA') : TV_CODE[r.script], text: r.text }));
}

// Short pieces speak reliably (long ones get cut off in some browsers)
function tvChunks(text, max = 170) {
  const out = [];
  text.split(/(?<=[.!?؟۔।:;\n])\s+/).forEach((sentence) => {
    let s = sentence.trim();
    while (s.length > max) { let cut = s.lastIndexOf(' ', max); if (cut < 40) cut = max; out.push(s.slice(0, cut)); s = s.slice(cut).trim(); }
    if (s) out.push(s);
  });
  return out.filter((x) => /[\p{L}\p{N}]/u.test(x));
}

const tvClean = (t) => String(t).replace(/```[\s\S]*?```/g, ' ').replace(/https?:\/\/\S+/g, ' ').replace(/[*_`#>~|]/g, '').replace(/^\s*[-•]\s+/gm, '').replace(/\s*\n+\s*/g, '. ').replace(/\s{2,}/g, ' ').trim();

/* ---------- speaking ---------- */
const tvNorm = (l) => String(l).toLowerCase().replace('_', '-');
function tvPickVoice(lang) {
  const want = tvNorm(lang); const prim = want.split('-')[0];
  const all = speechSynthesis.getVoices();
  const good = (v) => (/google|natural|neural|online/i.test(v.name) ? 1 : 0);
  const exact = all.filter((v) => tvNorm(v.lang) === want);
  const same = all.filter((v) => tvNorm(v.lang).split('-')[0] === prim);
  return (exact.length ? exact : same).sort((a, b) => good(b) - good(a))[0] || null;
}
const tvLatinLang = () => { const l = $('tcVoiceLang').value; return TV_LATIN.includes(l.split('-')[0]) ? l : 'en-IN'; };

function tvVoicesReady() {
  if (speechSynthesis.getVoices().length) return Promise.resolve();
  return new Promise((res) => { const done = () => { speechSynthesis.removeEventListener('voiceschanged', done); res(); }; speechSynthesis.addEventListener('voiceschanged', done); setTimeout(done, 1500); });
}

function tvUi() {
  $('tcMic').textContent = tv.listening ? '■' : '🎤';
  $('tcMic').setAttribute('aria-pressed', tv.listening);
  $('tcMic').classList.toggle('on', tv.listening);
  $('tcMic').setAttribute('aria-label', tv.listening ? 'Stop listening' : 'Speak your question');
  $('tcStop').classList.toggle('hidden', !tv.speaking);
  $('tcInput').placeholder = tv.listening ? 'Listening… speak now' : 'Ask your teacher… (Enter to send)';
}

async function tvSpeak(text) {
  if (!('speechSynthesis' in window)) { toast('This browser cannot read aloud.', true); return; }
  tvStopSpeaking();
  await tvVoicesReady();
  const parts = [];
  tvSegments(tvClean(text), tvLatinLang()).forEach((s) => tvChunks(s.text).forEach((c) => parts.push({ lang: s.lang, text: c })));
  tv.queue = parts; tv.speaking = true; tv.missing = new Set(); tvUi();
  tvNext();
}
function tvNext() {
  const item = tv.queue.shift();
  if (!item) {
    const was = tv.speaking; tv.speaking = false; tvUi();
    $('tcVoiceNote').textContent = tv.missing && tv.missing.size ? `Your device has no ${[...tv.missing].join(' or ')} voice, so those parts were not read. Add one in your phone or computer's text-to-speech settings.` : '';
    if (was && tv.talk && view === 'teacher') tvListen(); // talk mode: now it is the student's turn
    return;
  }
  const voice = tvPickVoice(item.lang);
  if (!voice && !item.lang.startsWith('en')) { tv.missing.add(TV_NAME[item.lang.split('-')[0]] || item.lang); tvNext(); return; }
  const gen = tv.gen; // a stopped or replaced reading must not carry on: its late 'end' events are ignored
  const u = new SpeechSynthesisUtterance(item.text);
  u.lang = voice ? voice.lang : item.lang; if (voice) u.voice = voice; u.rate = 0.95;
  u.onend = () => { if (gen === tv.gen) tvNext(); }; u.onerror = u.onend;
  speechSynthesis.speak(u);
}
function tvStopSpeaking() {
  tv.gen++; tv.queue = []; tv.speaking = false;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  if (document.getElementById('tcStop')) tvUi();
}

/* ---------- listening ---------- */
const TV_SR = () => window.SpeechRecognition || window.webkitSpeechRecognition;
function tvStopListening() { if (tv.rec && tv.listening) { try { tv.rec.stop(); } catch (e) { /* already stopped */ } } }
function tvListen() {
  const SR = TV_SR();
  if (!SR) { toast('This browser cannot listen. Use Chrome, Edge or Safari, or type your question.', true); return; }
  if (tv.listening) return;
  tvStopSpeaking();
  const r = new SR();
  r.lang = $('tcVoiceLang').value; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
  tv.gotText = false; let failed = false;
  r.onresult = (e) => {
    let text = '';
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + ' ';
    $('tcInput').value = text.trim(); tv.gotText = !!text.trim();
  };
  r.onerror = (e) => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    failed = true;
    toast(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'The microphone is blocked. Allow it in the browser (the page needs https or localhost).' : e.error === 'language-not-supported' ? 'This device cannot listen in that language. Choose another language.' : 'Voice problem: ' + e.error, true);
  };
  r.onend = () => {
    tv.listening = false; tvUi();
    if (failed) { tvTalk(false); return; }
    if (tv.gotText && $('tcInput').value.trim()) { tv.misses = 0; if (tv.talk) tcSend(); return; } // talk mode sends by itself, otherwise the student checks the words and presses Send
    if (tv.talk && ++tv.misses >= 2) { tvTalk(false); toast('I did not hear you, so talk mode is off.'); } else if (tv.talk) tvListen();
  };
  tv.rec = r; tv.listening = true; tvUi();
  try { r.start(); } catch (e) { tv.listening = false; tvUi(); toast('Could not start the microphone', true); }
}

function tvTalk(on) {
  tv.talk = on; tv.misses = 0; $('tcTalk').checked = on;
  if (!on) { tvStopListening(); tvStopSpeaking(); }
}

// Called by the chat when an answer arrives or fails
function tvOnAnswer(answer) {
  if (tv.talk || $('tcSpeak').checked) tvSpeak(answer);
}
function tvOnError() { if (tv.talk) tvTalk(false); }
function tvStopAll() { tvTalk(false); tvStopListening(); tvStopSpeaking(); }

function initTeacherVoice() {
  if (tv.ready) return;
  const sel = $('tcVoiceLang');
  TV_LANGS.forEach(([code, name]) => { const o = mk('option', '', name); o.value = code; sel.appendChild(o); });
  const saved = localStorage.getItem('tcVoiceLang');
  const dev = navigator.language || 'en-IN';
  sel.value = TV_LANGS.some(([c]) => c === saved) ? saved : (TV_LANGS.find(([c]) => c === dev) || TV_LANGS.find(([c]) => c.split('-')[0] === dev.split('-')[0]) || TV_LANGS[0])[0];
  sel.onchange = () => localStorage.setItem('tcVoiceLang', sel.value);
  $('tcSpeak').checked = localStorage.getItem('tcSpeak') === '1';
  $('tcSpeak').onchange = () => { localStorage.setItem('tcSpeak', $('tcSpeak').checked ? '1' : '0'); if (!$('tcSpeak').checked) tvStopSpeaking(); };
  $('tcTalk').onchange = () => { tvTalk($('tcTalk').checked); if (tv.talk && !tv.listening) tvListen(); };
  $('tcMic').onclick = () => (tv.listening ? tvStopListening() : tvListen());
  $('tcStop').onclick = () => { tvTalk(false); tvStopSpeaking(); };
  const canListen = !!TV_SR(); const canSpeak = 'speechSynthesis' in window;
  $('tcMic').classList.toggle('hidden', !canListen);
  $('tcTalk').closest('label').classList.toggle('hidden', !(canListen && canSpeak));
  $('tcSpeak').closest('label').classList.toggle('hidden', !canSpeak);
  if (!canListen || !canSpeak) $('tcVoiceNote').textContent = !canListen && !canSpeak ? 'Voice needs Chrome, Edge or Safari. You can still type.' : !canListen ? 'This browser cannot listen to your voice. Chrome, Edge or Safari can.' : 'This browser cannot read answers aloud.';
  document.addEventListener('visibilitychange', () => { if (document.hidden) tvStopAll(); });
  window.addEventListener('pagehide', tvStopAll);
  tv.ready = true; tvUi();
}
