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

/* ---------- Tahajjud ---------- */
function renderTahajjud(el, data) {
  const y = new Date(); y.setDate(y.getDate() - 1);
  const canMark = data.date === today() || data.date === fmt(y);
  const done = !!data.tahajjud;
  el.innerHTML = '';
  const row = mk('div', 'prayer ' + (done ? 'ontime' : ''));
  row.innerHTML = '<span class="tick">✓</span><div class="pinfo"><span class="name">Tahajjud</span><span class="ar" lang="ar">التهجد</span></div>';
  const box = mk('div', 'actions');
  if (done) box.appendChild(mk('span', 'badge', 'Prayed · locked'));
  else if (canMark) {
    const b = mk('button', 'act on', 'Mark prayed');
    b.onclick = () => markTahajjud(data.date);
    box.appendChild(b);
  } else box.appendChild(mk('span', 'badge soft', 'Not marked'));
  row.appendChild(box);
  el.appendChild(row);
}

async function markTahajjud(date) {
  const ok = await confirmBox('Prayed Tahajjud?', 'This will be saved for ' + (date === today() ? 'today' : nice(date)) + '. Once confirmed it is locked and cannot be removed.', 'Yes, I prayed');
  if (!ok) return;
  try {
    await api(`/${date}/tahajjud`, { method: 'POST' });
    toast('Tahajjud saved. May Allah accept it');
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
  try { info = await (await fetch('/team.json')).json(); }
  catch { box.textContent = 'Could not load team.json'; return; }
  box.replaceChildren();

  const intro = mk('div', 'card');
  intro.append(mk('h2', 'date-h', `${info.app.name} · v${info.app.version}`), mk('p', '', info.app.about));
  box.appendChild(intro);

  const link = (href, text) => { const a = mk('a', '', text); a.href = href; return a; };
  const tel = (p) => 'tel:' + String(p).replace(/[^\d+]/g, '');

  box.appendChild(mk('h2', 'sub-h', 'Developers and team'));
  info.team.forEach((m) => {
    const c = mk('div', 'card');
    c.append(mk('h3', '', m.name), mk('p', 'src', m.role));
    const p1 = mk('p'); p1.append('Email: ', link('mailto:' + m.email, m.email));
    // const p2 = mk('p'); p2.append('Phone: ', link(tel(m.phone), m.phone));
    // c.append(p1, p2);
    c.append(p1);
    box.appendChild(c);
  });

  box.appendChild(mk('h2', 'sub-h', 'Contact'));
  const c = mk('div', 'card');
  const e = mk('p'); e.append('Email: ', link('mailto:' + info.contact.email, info.contact.email));
  const p = mk('p'); p.append('Phone: ', link(tel(info.contact.phone), info.contact.phone));
  c.append(e, p, mk('p', '', 'Address: ' + info.contact.address));
  box.appendChild(c);
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
  $('toggleEn').onclick = () => {
    qEn = !qEn;
    localStorage.setItem('q.en', qEn ? '1' : '0');
    $('toggleEn').textContent = qEn ? 'Hide English' : 'Show English';
    if (surahCache[qs.n]) drawQuran();
  };
  $('toggleEn').textContent = qEn ? 'Hide English' : 'Show English';
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

/* ---------- Full Quran (alquran.cloud), 10 ayahs per page ---------- */
const QURAN_PER_PAGE = 10;
const qs = { n: Number(localStorage.getItem('q.n')) || 1, page: Number(localStorage.getItem('q.page')) || 1 };
let qSize = Number(localStorage.getItem('q.size')) || 1.7;
let qEn = localStorage.getItem('q.en') !== '0';
let surahs = null;
const surahCache = {};

async function qfetch(url) {
  const r = await fetch(url);
  const j = await r.json();
  if (!r.ok || j.code !== 200) throw new Error('bad response');
  return j.data;
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
    if (!surahCache[qs.n]) {
      body.replaceChildren(mk('p', 'hint', 'Loading…'));
      const d = await qfetch(`https://api.alquran.cloud/v1/surah/${qs.n}/editions/quran-uthmani,en.sahih`);
      surahCache[qs.n] = { ar: d[0].ayahs, en: d[1].ayahs, meta: d[0] };
    }
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
  body.appendChild(head);

  const from = (qs.page - 1) * QURAN_PER_PAGE;
  c.ar.slice(from, from + QURAN_PER_PAGE).forEach((a, i) => {
    const { bism, rest } = m.number !== 1 && a.numberInSurah === 1 ? splitBismillah(a.text) : { bism: null, rest: a.text };
    const card = mk('div', 'card');
    if (bism) {
      const b = mk('p', 'ayah-ar bism', bism); b.lang = 'ar'; b.dir = 'rtl'; b.style.fontSize = qSize + 'rem';
      card.appendChild(b);
    }
    const ar = mk('p', 'ayah-ar', rest); ar.lang = 'ar'; ar.dir = 'rtl'; ar.style.fontSize = qSize + 'rem';
    card.append(mk('span', 'ayah-no', `${m.number}:${a.numberInSurah}`), ar);
    if (qEn) card.appendChild(mk('p', '', c.en[from + i].text));
    body.appendChild(card);
  });

  renderPager($('quranPager'), qs.page, pages, (p) => { qs.page = p; drawQuran(); window.scrollTo({ top: 0 }); });
}

function setQSize(delta) {
  qSize = Math.min(3, Math.max(1.1, Math.round((qSize + delta) * 10) / 10));
  localStorage.setItem('q.size', qSize);
  if (surahCache[qs.n]) drawQuran();
}
