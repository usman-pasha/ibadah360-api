/* Ayah of the day, duas, the Quran reader and About us. Everything comes from the API.
   The Quran reader saves where you stopped (and your script, translation and text size) on the server,
   so it opens at the same place on any phone or computer. */
let duaPage = 1;
let ayahShift = 0;

let qState = null;   // saved place + choices, from GET /api/quran/progress
let qCur = null;     // what is on screen: { mode: 'para' | 'surah', n, page, at }
let lastQuran = null;
let qParas = null;
let qSurahs = null;
let qSavePending = null;
let qSaveTimer;

const getQState = async () => { if (!qState) qState = await api('/quran/progress'); return qState; };

const arabic = (text, script, size) => {
  const p = mk('p', 'ayah-ar ' + script, text);
  p.lang = 'ar'; p.dir = 'rtl';
  if (size) p.style.fontSize = size + 'rem';
  return p;
};

/* ---------- audio player ---------- */
const svg = (d, extra) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"${extra || ''}><path d="${d}"/></svg>`;
const ICON = {
  play: svg('M8 5v14l11-7z'), pause: svg('M6 5h4v14H6zM14 5h4v14h-4z'),
  prev: svg('M6 6h2v12H6zM9.5 12 18 6v12z'), next: svg('M16 6h2v12h-2zM6 18V6l8.5 6z'),
  close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};
const pstate = { audio: new Audio(), list: [], idx: -1, page: 1, pages: 1, mode: 'para', n: 1, autoplayNext: false };

function showPlayer(on) {
  $('player').classList.toggle('hidden', !on);
  document.body.classList.toggle('has-player', on);
}
function highlightPlaying() {
  if (typeof paintPlayingAyah === 'function') paintPlayingAyah(); // Quran Book
  document.querySelectorAll('.ayah-card.playing').forEach((c) => c.classList.remove('playing'));
  const cur = pstate.list[pstate.idx];
  if (!cur) return;
  const card = document.querySelector(`.ayah-card[data-key="${cur.key}"]`);
  if (card) card.classList.add('playing');
  $('plLabel').textContent = `Ayah ${cur.key}`;
  const r = metaCache && metaCache.quran.reciters.find((x) => x.code === (qState && qState.reciter));
  $('plSub').textContent = r ? r.name : '';
  $('plToggle').innerHTML = pstate.audio.paused ? ICON.play : ICON.pause;
}
function stopPlayer() {
  pstate.audio.pause();
  pstate.idx = -1; pstate.list = []; pstate.autoplayNext = false;
  showPlayer(false);
  highlightPlaying();
}
function playAyah(i) {
  const a = pstate.list[i];
  if (!a || !a.audio) return stopPlayer();
  pstate.idx = i;
  pstate.audio.src = a.audio;
  pstate.audio.play().catch(() => {});
  showPlayer(true);
  highlightPlaying();
}
// start from the ayahs on the page that is on screen
function playFromPage(i) {
  if (!lastQuran) return;
  pstate.list = lastQuran.ayahs.slice();
  pstate.page = lastQuran.page; pstate.pages = lastQuran.pages; pstate.mode = qCur.mode; pstate.n = qCur.n;
  playAyah(i);
}
function playSingle(a) {
  pstate.list = [{ key: a.key, audio: a.audio }]; pstate.page = 1; pstate.pages = 1;
  playAyah(0);
}
function nextAyah() {
  if (pstate.idx < pstate.list.length - 1) return playAyah(pstate.idx + 1);
  if (pstate.mode === 'book') return bookPlayEnded(); // Quran Book: turn the page and keep playing
  if (qState && qState.autoNext && pstate.page < pstate.pages) {
    pstate.autoplayNext = true;
    qCur = { mode: pstate.mode, n: pstate.n, page: pstate.page + 1, at: null };
    if (view === 'quran') loadQuran(); else { view = 'quran'; loadView(); }
    return;
  }
  stopPlayer();
}
const playButton = (fn, label) => { const b = mk('button', 'play-btn'); b.innerHTML = ICON.play; b.setAttribute('aria-label', label || 'Play'); b.onclick = fn; return b; };

function initPlayer() {
  $('plPrev').innerHTML = ICON.prev; $('plNext').innerHTML = ICON.next; $('plStop').innerHTML = ICON.close; $('plToggle').innerHTML = ICON.play;
  pstate.audio.onended = nextAyah;
  pstate.audio.onplay = pstate.audio.onpause = highlightPlaying;
  pstate.audio.onerror = () => { if (pstate.idx >= 0) toast('Could not play this recitation. Try another reciter.', true); stopPlayer(); };
  $('plToggle').onclick = () => (pstate.audio.paused ? pstate.audio.play().catch(() => {}) : pstate.audio.pause());
  $('plPrev').onclick = () => { if (pstate.idx > 0) playAyah(pstate.idx - 1); };
  $('plNext').onclick = nextAyah;
  $('plStop').onclick = stopPlayer;
}

/* ---------- counting what was read ---------- */
let readTimer;
let readMarked = '';
const rangesOf = (ayahs) => {
  const out = [];
  ayahs.forEach((a) => {
    const last = out[out.length - 1];
    if (last && last.surah === a.surah && a.number === last.to + 1) last.to = a.number;
    else out.push({ surah: a.surah, from: a.number, to: a.number });
  });
  return out;
};
function cancelReadMark() { clearTimeout(readTimer); }
// A page counts as read after it has been on screen for 6 seconds
function scheduleReadMark() {
  clearTimeout(readTimer);
  const ayahs = lastQuran.ayahs;
  if (!ayahs.length) return;
  const key = `${ayahs[0].key}-${ayahs[ayahs.length - 1].key}`;
  if (key === readMarked) return;
  readTimer = setTimeout(() => {
    api('/quran/progress', { method: 'PUT', body: JSON.stringify({ read: rangesOf(ayahs) }) }).then(() => { readMarked = key; }).catch(() => {});
  }, 6000);
}

/* ---------- ayah and duas ---------- */
async function loadAyah() {
  const box = $('ayah');
  try {
    const st = await getQState().catch(() => ({ script: 'uthmani', lang: 'en' }));
    const a = await api(`/quran/ayah-of-the-day?shift=${ayahShift}&lang=${st.lang}&script=${st.script}&reciter=${st.reciter || ''}`);
    box.replaceChildren(arabic(a.arabic, a.script));
    if (a.translation) box.appendChild(mk('p', '', a.translation));
    box.append(mk('p', 'src', `Surah ${a.surah.englishName} ${a.key}`), playButton(() => playSingle(a), `Play ayah ${a.key}`));
  } catch (e) { box.replaceChildren(mk('p', 'hint', e.message)); }
}

function duaCard(d) {
  const el = mk('div', 'card');
  el.append(mk('h3', '', d.title), arabic(d.ar, 'uthmani'), mk('p', 'tr', d.tr), mk('p', '', d.en), mk('p', 'src', 'Source: ' + d.src));
  return el;
}

async function renderDuas() {
  const r = await api(`/duas?search=${encodeURIComponent($('duaSearch').value.trim())}&page=${duaPage}&limit=5`);
  duaPage = r.page;
  const list = $('duaList');
  list.replaceChildren();
  if (!r.duas.length) list.appendChild(mk('p', 'empty', 'No dua found'));
  let prev = null;
  r.duas.forEach((d) => {
    if (d.cat !== prev) { list.appendChild(mk('h2', 'sub-h', d.cat)); prev = d.cat; }
    list.appendChild(duaCard(d));
  });
  renderPager($('duaPager'), r.page, r.pages, (p) => { duaPage = p; renderDuas(); $('duaSearch').scrollIntoView(); });
}

async function loadLearn() {
  const [today] = await Promise.all([api('/duas/today'), loadAyah()]);
  $('duaDay').replaceChildren(duaCard(today));
  await renderDuas();
}

/* ---------- Quran: saving where you stopped ---------- */
function scheduleQuranSave() {
  const f = lastQuran && lastQuran.ayahs[0];
  if (!f) return;
  qSavePending = { mode: qCur.mode, surah: f.surah, ayah: f.number };
  clearTimeout(qSaveTimer);
  qSaveTimer = setTimeout(flushQuranSave, 1200);
}
function flushQuranSave() {
  clearTimeout(qSaveTimer);
  if (!qSavePending) return;
  const body = JSON.stringify(qSavePending);
  qSavePending = null;
  api('/quran/progress', { method: 'PUT', body, keepalive: true }).then((p) => { qState = p; }).catch(() => {});
}
window.addEventListener('pagehide', flushQuranSave);

async function saveChoice(part) {
  try { qState = await api('/quran/progress', { method: 'PUT', body: JSON.stringify(part) }); }
  catch (e) { toast(e.message, true); }
}

/* ---------- Quran: showing a page ---------- */
function fillSelect(sel, items, value) {
  sel.replaceChildren(...items.map(([v, label]) => { const o = mk('option', '', label); o.value = v; return o; }));
  sel.value = value;
}

function syncQuranControls() {
  const para = qCur.mode === 'para';
  $('modePara').classList.toggle('on', para);
  $('modeSurah').classList.toggle('on', !para);
  $('navLabel').textContent = para ? 'Para (Juz)' : 'Surah';
  if ($('navSel').dataset.mode !== qCur.mode) {
    const items = para
      ? qParas.map((p) => [p.number, `Para ${p.number} · ${p.name}`])
      : qSurahs.map((s) => [s.number, `${s.number}. ${s.englishName} (${s.name})`]);
    fillSelect($('navSel'), items, qCur.n);
    $('navSel').dataset.mode = qCur.mode;
  }
  $('navSel').value = qCur.n;
}

function drawQuran() {
  const d = lastQuran;
  const meta = metaCache;
  const size = qState.size;
  const body = $('quranBody');
  body.replaceChildren();

  const head = mk('div', 'card');
  if (qCur.mode === 'para') {
    const p = d.para;
    head.append(mk('h3', '', `Para ${p.number} · ${p.name}`),
      mk('p', 'src', `${p.start.surahName} ${p.start.surah}:${p.start.ayah} to ${p.end.surahName} ${p.end.surah}:${p.end.ayah} · ${p.ayahCount} ayahs · page ${d.page} of ${d.pages}`));
  } else {
    const s = d.surah;
    head.append(mk('h3', '', `${s.number}. ${s.englishName} · ${s.englishNameTranslation}`),
      mk('p', 'src', `${s.revelationType} · ${s.numberOfAyahs} ayahs · page ${d.page} of ${d.pages}`));
  }
  if (d.scriptFallback) head.appendChild(mk('p', 'src', 'The Indian script is not available here yet, so the Madani script is shown.'));
  if (d.translationMissing) head.appendChild(mk('p', 'src', 'This translation is not available here yet.'));
  body.appendChild(head);

  const L = meta.quran.languages.find((l) => l.code === d.language);
  d.ayahs.forEach((a, i) => {
    // a new surah starts here: show its name (in para mode) and its Bismillah
    if (a.surahStart && (qCur.mode === 'para' || a.surahStart.bismillah)) {
      const h = mk('div', 'card surah-head');
      if (qCur.mode === 'para') h.appendChild(mk('h3', '', `${a.surahStart.number}. ${a.surahStart.englishName} · ${a.surahStart.englishNameTranslation}`));
      if (a.surahStart.bismillah) {
        const b = arabic(a.surahStart.bismillah, d.script, size);
        b.classList.add('bism');
        h.appendChild(b);
      }
      body.appendChild(h);
    }
    const card = mk('div', 'card ayah-card');
    card.dataset.key = a.key;
    const top = mk('div', 'ayah-top');
    top.append(mk('span', 'ayah-no', a.key), playButton(() => playFromPage(i), `Play ayah ${a.key}`));
    card.append(top, arabic(a.arabic, d.script, size));
    if (a.translation && L) {
      const tr = mk('p', 'tr-text' + (L.code === 'ur' ? ' urdu' : ''), a.translation);
      tr.lang = L.code; tr.dir = L.dir;
      card.appendChild(tr);
    }
    body.appendChild(card);
  });
  renderPager($('quranPager'), d.page, d.pages, (p) => { qCur.page = p; qCur.at = null; loadQuran(); window.scrollTo({ top: 0 }); });
}

async function loadQuran() {
  const body = $('quranBody');
  try {
    const meta = await getMeta();
    const st = await getQState();
    if (!qParas) {
      [qParas, qSurahs] = await Promise.all([api('/quran/paras'), api('/quran/surahs')]);
      fillSelect($('scriptSel'), meta.quran.scripts.map((s) => [s.code, s.name]), st.script);
      fillSelect($('langSel'), [...meta.quran.languages.map((l) => [l.code, l.name]), ['none', 'No translation']], st.lang);
      fillSelect($('reciterSel'), meta.quran.reciters.map((r) => [r.code, r.name]), st.reciter);
    }
    if (!qCur) {
      // first time this visit: open exactly where the person stopped
      qCur = { mode: st.mode, n: st.mode === 'para' ? st.para : st.surah, page: 1, at: st.mode === 'para' ? `${st.surah}:${st.ayah}` : String(st.ayah) };
      $('resumeNote').textContent = st.started ? `Continuing where you stopped: ${st.label}` : 'Your place is saved automatically, so next time you continue where you stopped.';
    }
    syncQuranControls();
    $('scriptSel').value = st.script;
    $('langSel').value = st.lang;
    $('reciterSel').value = st.reciter;
    $('autoNext').checked = !!st.autoNext;
    body.replaceChildren(mk('p', 'hint', 'Loading… the first time a surah is opened it can take a few seconds.'));
    const where = qCur.at ? `&at=${encodeURIComponent(qCur.at)}` : `&page=${qCur.page}`;
    lastQuran = await api(`/quran/${qCur.mode}/${qCur.n}?limit=${meta.quran.perPage}&script=${st.script}&lang=${st.lang}&reciter=${st.reciter}${where}`);
    qCur.page = lastQuran.page;
    qCur.at = null;
    drawQuran();
    scheduleQuranSave();
    scheduleReadMark();
    if (pstate.autoplayNext) { pstate.autoplayNext = false; playFromPage(0); } else highlightPlaying();
  } catch (e) {
    body.replaceChildren(mk('p', 'empty', e.message));
    const b = mk('button', 'btn', 'Try again');
    b.onclick = loadQuran;
    body.appendChild(b);
    $('quranPager').replaceChildren();
  }
}

// Switch between para and surah, staying at the same place in the Quran
async function switchMode(mode) {
  if (!lastQuran || qCur.mode === mode) return;
  const f = lastQuran.ayahs[0];
  try {
    if (mode === 'para') {
      const l = await api(`/quran/locate?surah=${f.surah}&ayah=${f.number}`);
      qCur = { mode, n: l.para, page: 1, at: `${f.surah}:${f.number}` };
    } else qCur = { mode, n: f.surah, page: 1, at: String(f.number) };
    loadQuran();
  } catch (e) { toast(e.message, true); }
}

let sizeTimer;
function setQSize(delta) {
  if (!qState || !lastQuran) return;
  qState.size = Math.min(3, Math.max(1.1, Math.round((qState.size + delta) * 10) / 10));
  drawQuran();
  clearTimeout(sizeTimer);
  sizeTimer = setTimeout(() => saveChoice({ size: qState.size }), 600);
}

/* ---------- About us ---------- */
async function loadAbout() {
  const box = $('aboutBody');
  let info;
  try { info = await api('/about'); }
  catch (e) { box.replaceChildren(mk('p', 'empty', e.message)); return; }
  box.replaceChildren();

  const link = (href, text) => { const a = mk('a', '', text); a.href = href; return a; };
  const tel = (p) => 'tel:' + String(p).replace(/[^\d+]/g, '');

  const intro = mk('div', 'card');
  intro.append(mk('h2', 'date-h', `${info.appName} · v${info.version}`), mk('p', 'src', info.tagline), mk('p', '', info.about));
  box.appendChild(intro);

  if ((info.features || []).length) {
    box.appendChild(mk('h2', 'sub-h', 'What you can do'));
    const fc = mk('div', 'card');
    const ul = mk('ul', 'feat');
    info.features.forEach((f) => ul.appendChild(mk('li', '', f)));
    fc.appendChild(ul);
    box.appendChild(fc);
  }

  box.appendChild(mk('h2', 'sub-h', 'Developers and team'));
  (info.team || []).forEach((m) => {
    const c = mk('div', 'card');
    const p1 = mk('p'); p1.append('Email: ', link('mailto:' + m.email, m.email));
    const p2 = mk('p'); p2.append('Phone: ', link(tel(m.phone), m.phone));
    c.append(mk('h3', '', m.name), mk('p', 'src', m.role), p1, p2);
    box.appendChild(c);
  });

  if (info.contact) {
    box.appendChild(mk('h2', 'sub-h', 'Contact us'));
    const c = mk('div', 'card');
    const e = mk('p'); e.append('Email: ', link('mailto:' + info.contact.email, info.contact.email));
    const p = mk('p'); p.append('Phone: ', link(tel(info.contact.phone), info.contact.phone));
    c.append(e, p, mk('p', '', 'Address: ' + info.contact.address));
    box.appendChild(c);
  }
  if (info.disclaimer) box.appendChild(mk('p', 'src disclaimer', info.disclaimer));
  if (info.copyright) box.appendChild(mk('p', 'copy', info.copyright));
}

function initLearn() {
  $('duaSearch').oninput = () => { duaPage = 1; renderDuas().catch((e) => toast(e.message, true)); };
  $('anotherAyah').onclick = () => { ayahShift++; loadAyah(); };
  $('modePara').onclick = () => switchMode('para');
  $('modeSurah').onclick = () => switchMode('surah');
  $('navSel').onchange = () => { qCur = { mode: qCur.mode, n: Number($('navSel').value), page: 1, at: null }; loadQuran(); window.scrollTo({ top: 0 }); };
  $('scriptSel').onchange = async () => { await saveChoice({ script: $('scriptSel').value }); loadQuran(); };
  $('langSel').onchange = async () => { await saveChoice({ lang: $('langSel').value }); loadQuran(); };
  $('fontPlus').onclick = () => setQSize(0.2);
  $('fontMinus').onclick = () => setQSize(-0.2);
  $('reciterSel').onchange = async () => { stopPlayer(); await saveChoice({ reciter: $('reciterSel').value }); loadQuran(); };
  $('autoNext').onchange = () => saveChoice({ autoNext: $('autoNext').checked });
  $('playPage').onclick = () => playFromPage(0);
  initPlayer();
}
