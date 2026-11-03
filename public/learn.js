/* Tahajjud, Ayah of the day, Duas, About. Uses helpers from tracker.js. */
const dayNum = () => Math.floor(new Date(today() + 'T00:00:00').getTime() / 864e5);
let missedPage = 1;
let duaPage = 1;
const DUAS_PER_PAGE = 5;
const mk = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/* ---------- Voluntary prayers (Nafl) ---------- */
const NAFL = [
  { key: 'ishraq', name: 'Ishraq', ar: 'الإشراق', tip: '2 or 4 rakats, about 15 to 20 minutes after sunrise' },
  { key: 'duha', name: 'Duha (Chasht)', ar: 'الضحى', tip: '2 to 12 rakats, from mid-morning until before Dhuhr' },
  { key: 'awwabin', name: 'Awwabin', ar: 'الأوابين', tip: '2 to 6 rakats after the Maghrib prayer' },
  { key: 'witr', name: 'Witr', ar: 'الوتر', tip: 'An odd number of rakats (1, 3 or more) after Isha' },
  { key: 'tahajjud', name: 'Tahajjud', ar: 'التهجد', tip: '2 to 12 rakats after sleeping, best in the last third of the night' },
];

function renderNafl(el, data) {
  const y = new Date(); y.setDate(y.getDate() - 1);
  const canMark = data.date === today() || data.date === fmt(y);
  el.replaceChildren();
  NAFL.forEach((p) => {
    const done = !!data[p.key];
    const row = mk('div', 'prayer ' + (done ? 'ontime' : ''));
    const info = mk('div', 'pinfo');
    const ar = mk('span', 'ar', p.ar); ar.lang = 'ar';
    info.append(mk('span', 'name', p.name), ar, mk('span', 'tip', p.tip));
    const box = mk('div', 'actions');
    if (done) box.appendChild(mk('span', 'badge', 'Prayed · locked'));
    else if (canMark) {
      const b = mk('button', 'act on', 'Mark prayed');
      b.onclick = () => markNafl(data.date, p);
      box.appendChild(b);
    } else box.appendChild(mk('span', 'badge soft', 'Not marked'));
    row.append(mk('span', 'tick', '✓'), info, box);
    el.appendChild(row);
  });
}

async function markNafl(date, p) {
  const ok = await confirmBox(`Prayed ${p.name}?`, `This will be saved for ${date === today() ? 'today' : nice(date)}. Once confirmed it is locked and cannot be removed.`, 'Yes, I prayed');
  if (!ok) return;
  try {
    await api(`/${date}/nafl`, { method: 'POST', body: JSON.stringify({ prayer: p.key }) });
    toast(`${p.name} saved. May Allah accept it`);
  } catch (e) { toast(e.message, true); }
  loadView();
}

/* ---------- Ayah of the day (alquran.cloud) ---------- */
let ayahShift = 0;
async function loadAyah() {
  const box = $('ayah');
  const idx = (dayNum() + ayahShift) % AYAH_REFS.length;
  const key = 'ayah|' + today();
  let item = null;
  try {
    const cached = ayahShift === 0 && localStorage.getItem(key);
    if (cached) item = JSON.parse(cached);
    else {
      const r = await fetch(`https://api.alquran.cloud/v1/ayah/${AYAH_REFS[idx]}/editions/quran-uthmani,en.sahih`);
      const j = await r.json();
      if (!r.ok || !j.data || j.data.length < 2) throw new Error('bad');
      const [ar, en] = j.data;
      item = { ref: `Surah ${ar.surah.englishName} ${ar.surah.number}:${ar.numberInSurah}`, ar: ar.text, en: en.text, live: true };
      if (ayahShift === 0) {
        Object.keys(localStorage).filter((k) => k.startsWith('ayah|')).forEach((k) => localStorage.removeItem(k));
        localStorage.setItem(key, JSON.stringify(item));
      }
    }
  } catch {
    item = FALLBACK_AYAH[(dayNum() + ayahShift) % FALLBACK_AYAH.length];
  }
  box.replaceChildren();
  const ar = mk('p', 'ayah-ar', item.ar); ar.lang = 'ar'; ar.dir = 'rtl';
  box.append(ar, mk('p', '', item.en), mk('p', 'src', item.ref + (item.live ? ' · Arabic and Saheeh International translation via alquran.cloud' : ' · offline copy')));
}

/* ---------- Duas ---------- */
function duaCard(d) {
  const el = mk('div', 'card');
  const ar = mk('p', 'ayah-ar', d.ar); ar.lang = 'ar'; ar.dir = 'rtl';
  el.append(mk('h3', '', d.title), ar, mk('p', 'tr', d.tr), mk('p', '', d.en), mk('p', 'src', 'Source: ' + d.src));
  return el;
}

function renderDuaList() {
  const term = $('duaSearch').value.trim().toLowerCase();
  const list = $('duaList');
  list.replaceChildren();
  const found = DUAS.filter((d) => !term || (d.title + ' ' + d.en + ' ' + d.tr + ' ' + d.cat).toLowerCase().includes(term));
  if (!found.length) {
    list.appendChild(mk('p', 'empty', 'No dua found'));
    $('duaPager').replaceChildren();
    return;
  }
  const pages = Math.ceil(found.length / DUAS_PER_PAGE);
  duaPage = Math.min(duaPage, pages);
  let prev = null;
  found.slice((duaPage - 1) * DUAS_PER_PAGE, duaPage * DUAS_PER_PAGE).forEach((d) => {
    if (d.cat !== prev) { list.appendChild(mk('h2', 'sub-h', d.cat)); prev = d.cat; }
    list.appendChild(duaCard(d));
  });
  renderPager($('duaPager'), duaPage, pages, (p) => { duaPage = p; renderDuaList(); $('duaSearch').scrollIntoView(); });
}

async function loadLearn() {
  $('duaDay').replaceChildren(duaCard(DUAS[dayNum() % DUAS.length]));
  renderDuaList();
  await loadAyah();
}

/* ---------- About ---------- */
async function loadAbout() {
  const box = $('aboutBody');
  let info;
  try {
    const r = await fetch('/api/about', { headers: { Authorization: 'Bearer ' + token } });
    if (r.status === 401) { localStorage.clear(); location.href = 'index.html'; return; }
    info = await r.json();
    if (!r.ok) throw new Error(info.message || 'Could not load About us');
  } catch (e) {
    box.replaceChildren(mk('p', 'empty', e.message || 'Could not load About us'));
    return;
  }
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
  $('duaSearch').oninput = () => { duaPage = 1; renderDuaList(); };

  // toggle menu
  $('menuBtn').onclick = () => ($('drawer').classList.contains('open') ? closeDrawer() : openDrawer());
  $('scrim').onclick = closeDrawer;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  // Quran controls
  $('surahSel').onchange = () => { qs.n = Number($('surahSel').value); qs.page = 1; loadQuran(); };
  $('fontPlus').onclick = () => setQSize(0.2);
  $('fontMinus').onclick = () => setQSize(-0.2);
  $('scriptSel').onchange = () => { qScript = $('scriptSel').value; localStorage.setItem('q.script', qScript); loadQuran(); };
  $('langSel').onchange = () => { qLang = $('langSel').value; localStorage.setItem('q.lang', qLang); loadQuran(); };
  $('anotherAyah').onclick = () => { ayahShift++; loadAyah(); };
}

/* ---------- Toggle menu ---------- */
function openDrawer() {
  $('drawer').classList.add('open');
  $('scrim').classList.add('open');
  $('menuBtn').setAttribute('aria-expanded', 'true');
  ($('drawer').querySelector('.nav-item.active') || $('drawer').querySelector('.nav-item')).focus();
}
function closeDrawer() {
  $('drawer').classList.remove('open');
  $('scrim').classList.remove('open');
  $('menuBtn').setAttribute('aria-expanded', 'false');
}

/* ---------- Pagination (used by Quran, duas and missed list) ---------- */
function renderPager(el, page, pages, onChange) {
  el.replaceChildren();
  if (pages <= 1) return;
  const btn = (label, p, o = {}) => {
    const b = mk('button', 'pg' + (o.cur ? ' cur' : ''), label);
    b.disabled = !!o.dis;
    b.setAttribute('aria-label', o.aria || 'Page ' + label);
    if (o.cur) b.setAttribute('aria-current', 'page');
    b.onclick = () => onChange(p);
    return b;
  };
  el.append(btn('‹', page - 1, { dis: page === 1, aria: 'Previous page' }));
  const nums = [...new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages))].sort((a, b) => a - b);
  let last = 0;
  nums.forEach((n) => {
    if (n - last > 1) el.append(mk('span', 'pg-gap', '…'));
    el.append(btn(String(n), n, { cur: n === page }));
    last = n;
  });
  el.append(btn('›', page + 1, { dis: page === pages, aria: 'Next page' }));
}

/* ---------- Full Quran: Indian (Indo-Pak) or Madani script, with translations ---------- */
const QURAN_PER_PAGE = 10;
const LANGS = {
  'en.sahih': { lang: 'en', dir: 'ltr' }, 'ur.jalandhry': { lang: 'ur', dir: 'rtl' }, 'hi.hindi': { lang: 'hi', dir: 'ltr' },
  'bn.bengali': { lang: 'bn', dir: 'ltr' }, 'ta.tamil': { lang: 'ta', dir: 'ltr' }, 'ml.abdulhameed': { lang: 'ml', dir: 'ltr' },
};
const qs = { n: Number(localStorage.getItem('q.n')) || 1, page: Number(localStorage.getItem('q.page')) || 1 };
let qSize = Number(localStorage.getItem('q.size')) || 1.7;
let qScript = localStorage.getItem('q.script') || 'indopak';
let qLang = localStorage.getItem('q.lang') || 'en.sahih';
let surahs = null;
const surahCache = {};

async function qfetch(url) {
  const r = await fetch(url);
  const j = await r.json();
  if (!r.ok || j.code !== 200) throw new Error('bad response');
  return j.data;
}

// Loads whatever is missing for the current surah. Script and translation are optional extras.
async function ensureSurah() {
  const c = surahCache[qs.n] || (surahCache[qs.n] = { tr: {} });
  if (!c.ar) {
    const d = await qfetch(`https://api.alquran.cloud/v1/surah/${qs.n}/quran-uthmani`);
    c.meta = d;
    c.ar = d.ayahs;
  }
  if (qScript === 'indopak' && !c.ip && !c.ipFail) {
    try {
      const r = await fetch(`https://api.quran.com/api/v4/quran/verses/indopak?chapter_number=${qs.n}`);
      const j = await r.json();
      c.ip = {};
      j.verses.forEach((v) => { c.ip[Number(v.verse_key.split(':')[1])] = v.text_indopak; });
      if (!Object.keys(c.ip).length) throw new Error('empty');
    } catch { c.ip = null; c.ipFail = true; }
  }
  if (qLang !== 'none' && !c.tr[qLang] && !c.trFail) {
    try { c.tr[qLang] = (await qfetch(`https://api.alquran.cloud/v1/surah/${qs.n}/${qLang}`)).ayahs; }
    catch { c.trFail = true; }
  }
  if (c.tr[qLang]) c.trFail = false;
}

async function loadQuran() {
  const body = $('quranBody');
  try {
    if (!surahs) {
      body.replaceChildren(mk('p', 'hint', 'Loading…'));
      surahs = await qfetch('https://api.alquran.cloud/v1/surah');
      surahs.forEach((s) => {
        const o = mk('option', '', `${s.number}. ${s.englishName} (${s.name})`);
        o.value = s.number;
        $('surahSel').appendChild(o);
      });
    }
    $('surahSel').value = qs.n;
    $('scriptSel').value = qScript;
    $('langSel').value = qLang;
    const c = surahCache[qs.n];
    if (!c || !c.ar || (qScript === 'indopak' && !c.ip && !c.ipFail) || (qLang !== 'none' && !c.tr[qLang])) {
      body.replaceChildren(mk('p', 'hint', 'Loading…'));
    }
    qs.trFailLang = null;
    await ensureSurah();
    drawQuran();
  } catch {
    body.replaceChildren(mk('p', 'empty', 'Could not load the Quran. Check your internet and try again.'));
    const b = mk('button', 'btn', 'Try again');
    b.onclick = loadQuran;
    body.appendChild(b);
    $('quranPager').replaceChildren();
  }
}

// alquran.cloud puts the Bismillah in front of ayah 1 of most surahs. Show it on its own line.
function splitBismillah(text) {
  const parts = text.split(' ');
  const plain = parts[0].replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
  if (plain === 'بسم' && parts.length > 4) return { bism: parts.slice(0, 4).join(' '), rest: parts.slice(4).join(' ') };
  return { bism: null, rest: text };
}

function drawQuran() {
  const c = surahCache[qs.n];
  const m = c.meta;
  const pages = Math.ceil(c.ar.length / QURAN_PER_PAGE);
  qs.page = Math.min(Math.max(1, qs.page), pages);
  localStorage.setItem('q.n', qs.n);
  localStorage.setItem('q.page', qs.page);

  const body = $('quranBody');
  body.replaceChildren();
  const head = mk('div', 'card');
  head.append(
    mk('h3', '', `${m.number}. ${m.englishName} · ${m.englishNameTranslation}`),
    mk('p', 'src', `${m.revelationType} · ${m.numberOfAyahs} ayahs · page ${qs.page} of ${pages}`)
  );
  if (qScript === 'indopak' && c.ipFail) head.appendChild(mk('p', 'src', 'The Indian script could not be loaded, so the Madani script is shown.'));
  if (qLang !== 'none' && !c.tr[qLang]) head.appendChild(mk('p', 'src', 'The translation could not be loaded.'));
  body.appendChild(head);

  const useIp = qScript === 'indopak' && c.ip;
  const L = LANGS[qLang];
  const from = (qs.page - 1) * QURAN_PER_PAGE;
  c.ar.slice(from, from + QURAN_PER_PAGE).forEach((a, i) => {
    const sp = m.number !== 1 && a.numberInSurah === 1 ? splitBismillah(a.text) : { bism: null, rest: a.text };
    const cls = 'ayah-ar ' + (useIp ? 'indopak' : 'uthmani');
    const card = mk('div', 'card');
    if (sp.bism) {
      const b = mk('p', cls + ' bism', sp.bism); b.lang = 'ar'; b.dir = 'rtl'; b.style.fontSize = qSize + 'rem';
      card.appendChild(b);
    }
    const ar = mk('p', cls, useIp && c.ip[a.numberInSurah] ? c.ip[a.numberInSurah] : sp.rest);
    ar.lang = 'ar'; ar.dir = 'rtl'; ar.style.fontSize = qSize + 'rem';
    card.append(mk('span', 'ayah-no', `${m.number}:${a.numberInSurah}`), ar);
    if (L && c.tr[qLang] && c.tr[qLang][from + i]) {
      const tr = mk('p', 'tr-text' + (L.lang === 'ur' ? ' urdu' : ''), c.tr[qLang][from + i].text);
      tr.lang = L.lang; tr.dir = L.dir;
      card.appendChild(tr);
    }
    body.appendChild(card);
  });

  renderPager($('quranPager'), qs.page, pages, (p) => { qs.page = p; drawQuran(); window.scrollTo({ top: 0 }); });
}

function setQSize(delta) {
  qSize = Math.min(3, Math.max(1.1, Math.round((qSize + delta) * 10) / 10));
  localStorage.setItem('q.size', qSize);
  if (surahCache[qs.n] && surahCache[qs.n].ar) drawQuran();
}
