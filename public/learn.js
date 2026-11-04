/* Ayah of the day, duas, the Quran reader and About us. Everything comes from the API. */
let ayahShift = 0;
let duaPage = 1;
let lastQuran = null;
const qs = { n: Number(localStorage.getItem('q.n')) || 1, page: Number(localStorage.getItem('q.page')) || 1 };
let qSize = Number(localStorage.getItem('q.size')) || 1.7;
let qScript = localStorage.getItem('q.script') || 'indopak';
let qLang = localStorage.getItem('q.lang') || 'en';

const arabic = (text, script, size) => {
  const p = mk('p', 'ayah-ar ' + script, text);
  p.lang = 'ar'; p.dir = 'rtl';
  if (size) p.style.fontSize = size + 'rem';
  return p;
};

/* ---------- ayah and duas ---------- */
async function loadAyah() {
  const box = $('ayah');
  try {
    const a = await api(`/quran/ayah-of-the-day?shift=${ayahShift}&lang=${qLang}&script=${qScript}`);
    box.replaceChildren(arabic(a.arabic, a.script));
    if (a.translation) box.appendChild(mk('p', '', a.translation));
    box.appendChild(mk('p', 'src', `Surah ${a.surah.englishName} ${a.key}`));
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

/* ---------- Quran ---------- */
function drawQuran() {
  const d = lastQuran;
  const meta = metaCache;
  const body = $('quranBody');
  body.replaceChildren();
  const s = d.surah;
  const head = mk('div', 'card');
  head.append(mk('h3', '', `${s.number}. ${s.englishName} · ${s.englishNameTranslation}`), mk('p', 'src', `${s.revelationType} · ${s.numberOfAyahs} ayahs · page ${d.page} of ${d.pages}`));
  if (d.scriptFallback) head.appendChild(mk('p', 'src', 'The Indian script is not available for this surah yet, so the Madani script is shown.'));
  if (d.translationMissing) head.appendChild(mk('p', 'src', 'This translation is not available for this surah yet.'));
  body.appendChild(head);

  const L = meta.quran.languages.find((l) => l.code === d.language);
  d.ayahs.forEach((a, i) => {
    const card = mk('div', 'card');
    if (i === 0 && d.page === 1 && s.bismillah) {
      const b = arabic(s.bismillah, d.script, qSize);
      b.classList.add('bism');
      card.appendChild(b);
    }
    card.append(mk('span', 'ayah-no', a.key), arabic(a.arabic, d.script, qSize));
    if (a.translation && L) {
      const tr = mk('p', 'tr-text' + (L.code === 'ur' ? ' urdu' : ''), a.translation);
      tr.lang = L.code; tr.dir = L.dir;
      card.appendChild(tr);
    }
    body.appendChild(card);
  });
  renderPager($('quranPager'), d.page, d.pages, (p) => { qs.page = p; loadQuran(); window.scrollTo({ top: 0 }); });
}

function fillSelect(sel, items, value) {
  sel.replaceChildren(...items.map(([v, label]) => { const o = mk('option', '', label); o.value = v; return o; }));
  sel.value = value;
}

async function loadQuran() {
  const body = $('quranBody');
  try {
    const meta = await getMeta();
    if (!$('surahSel').options.length) {
      const surahs = await api('/quran/surahs');
      fillSelect($('surahSel'), surahs.map((s) => [s.number, `${s.number}. ${s.englishName} (${s.name})`]), qs.n);
      fillSelect($('scriptSel'), meta.quran.scripts.map((s) => [s.code, s.name]), qScript);
      fillSelect($('langSel'), [...meta.quran.languages.map((l) => [l.code, l.name]), ['none', 'No translation']], qLang);
    }
    $('surahSel').value = qs.n; $('scriptSel').value = qScript; $('langSel').value = qLang;
    body.replaceChildren(mk('p', 'hint', 'Loading… the first time a surah is opened it can take a few seconds.'));
    lastQuran = await api(`/quran/surah/${qs.n}?page=${qs.page}&limit=${meta.quran.perPage}&script=${qScript}&lang=${qLang}`);
    qs.page = lastQuran.page;
    localStorage.setItem('q.n', qs.n);
    localStorage.setItem('q.page', qs.page);
    drawQuran();
  } catch (e) {
    body.replaceChildren(mk('p', 'empty', e.message));
    const b = mk('button', 'btn', 'Try again');
    b.onclick = loadQuran;
    body.appendChild(b);
    $('quranPager').replaceChildren();
  }
}

function setQSize(delta) {
  qSize = Math.min(3, Math.max(1.1, Math.round((qSize + delta) * 10) / 10));
  localStorage.setItem('q.size', qSize);
  if (lastQuran) drawQuran();
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
  $('surahSel').onchange = () => { qs.n = Number($('surahSel').value); qs.page = 1; loadQuran(); };
  $('scriptSel').onchange = () => { qScript = $('scriptSel').value; localStorage.setItem('q.script', qScript); loadQuran(); };
  $('langSel').onchange = () => { qLang = $('langSel').value; localStorage.setItem('q.lang', qLang); loadQuran(); };
  $('fontPlus').onclick = () => setQSize(0.2);
  $('fontMinus').onclick = () => setQSize(-0.2);
}
