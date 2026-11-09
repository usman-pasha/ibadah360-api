/* Quran Book. Two layouts:
   print = pictures of a printed 15-line Indo-Pak Quran (Nastaleeq), 610 pages, from public/mushaf/
   text  = the Quran as Madani text laid out by the app, 604 pages
   Swipe or tap to turn pages. The server sends what is on each page; this file only draws it. */
const bk = {
  layout: 'print', meta: null, data: null, cache: {}, lang: 'none', size: 2, sel: null, selArabic: '',
  saveTimer: null, readTimer: null, readMarked: '', busy: false, dirty: false, ready: false,
  state: { print: { loaded: false, page: 1, idx: null, bookmarks: [] }, text: { loaded: false, page: 1, idx: null, bookmarks: [] } },
};
const bkSt = () => bk.state[bk.layout];
const bkPages = () => (bk.layout === 'print' ? 610 : 604);
const bkUrl = (p) => p + (p.includes('?') ? '&' : '?') + 'layout=' + bk.layout;
const toArabicDigits = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

async function bookPageData(n) {
  const ck = bk.layout + ':' + n;
  if (bk.cache[ck]) return bk.cache[ck];
  const reciter = (typeof qState !== 'undefined' && qState && qState.reciter) || '';
  const d = await api(bkUrl('/book/page/' + n) + (reciter ? '&reciter=' + encodeURIComponent(reciter) : ''));
  bk.cache[ck] = d;
  const keys = Object.keys(bk.cache);
  if (keys.length > 16) delete bk.cache[keys[0]]; // keep memory small
  return d;
}
function bookPrefetch(n) {
  if (n < 1 || n > bkPages()) return;
  bookPageData(n).then((d) => { if (d.image) new Image().src = d.image; }).catch(() => {});
}

/* ---------- drawing a page ---------- */
function drawPrintPage(d) {
  const box = mk('div', 'bk-sheet bk-print');
  box.dataset.page = d.page;
  const img = mk('img', 'bk-img');
  img.alt = `Quran page ${d.page}: ${d.surahNames.map((s) => s.englishName).join(', ')}`;
  img.draggable = false;
  img.decoding = 'async';
  img.onerror = () => { img.replaceWith(mk('p', 'empty', 'This page picture is missing. Copy the page pictures into the public/mushaf folder (001.webp to 610.webp) and refresh.')); };
  img.src = d.image;
  box.appendChild(img);
  const chips = mk('div', 'bk-chips');
  chips.appendChild(mk('span', 'src', 'Ayahs on this page:'));
  let lastSurah = 0;
  d.ayahs.forEach((a) => {
    const c = mk('button', 'chip bk-chip', a.surah !== lastSurah ? a.key : String(a.number));
    lastSurah = a.surah;
    c.dataset.key = a.key;
    c.onclick = () => selectBookAyah(a, c);
    chips.appendChild(c);
  });
  box.appendChild(chips);
  return box;
}

function drawTextPage(d) {
  const box = mk('div', 'bk-sheet');
  box.dataset.page = d.page;
  const head = mk('div', 'bk-head');
  head.append(mk('span', '', 'Juz ' + d.juz), mk('span', 'bk-head-s', d.surahNames.map((s) => s.name).join(' · ')));
  box.appendChild(head);
  const text = mk('div', 'bk-text');
  text.dir = 'rtl';
  d.ayahs.forEach((a) => {
    if (a.surahStart) {
      const s = a.surahStart;
      const banner = mk('div', 'bk-banner');
      banner.append(mk('b', '', s.name), mk('small', '', `${s.englishName} · ${s.number}`));
      text.appendChild(banner);
      if (s.bismillah) text.appendChild(mk('div', 'bk-bism', s.bismillah));
    }
    const sp = mk('span', 'bk-ayah');
    sp.dataset.key = a.key;
    sp.append(a.text + ' ', mk('span', 'bk-end', '﴿' + toArabicDigits(a.number) + '﴾'), ' ');
    sp.onclick = () => selectBookAyah(a, sp);
    text.appendChild(sp);
  });
  box.appendChild(text);
  box.appendChild(mk('div', 'bk-foot', toArabicDigits(d.page)));
  box.style.fontSize = bk.size + 'rem';
  return box;
}

async function showBookPage(n, dir) {
  n = Math.min(bkPages(), Math.max(1, n));
  if (bk.busy) return;
  bk.busy = true;
  closeBookSheet();
  const stage = $('bkStage');
  const layout = bk.layout;
  try {
    const d = await bookPageData(n);
    if (layout !== bk.layout) { bk.busy = false; return; } // the person switched layout while this loaded
    const sheet = layout === 'print' ? drawPrintPage(d) : drawTextPage(d);
    const old = stage.firstElementChild;
    if (old && dir) {
      // next page (dir 1) turns like turning a printed Arabic book
      old.classList.add(dir > 0 ? 'bk-out-next' : 'bk-out-prev');
      sheet.classList.add(dir > 0 ? 'bk-in-next' : 'bk-in-prev');
      stage.appendChild(sheet);
      setTimeout(() => old.remove(), 380);
    } else stage.replaceChildren(sheet);
    bk.data = d; bkSt().page = n;
    window.scrollTo(0, 0);
    $('bkPageNo').value = n;
    $('bkPageNo').max = bkPages();
    $('bkPageLabel').textContent = `Page (1 to ${bkPages()})`;
    $('bkLeft').disabled = n >= bkPages(); $('bkRight').disabled = n <= 1; // the Arabic book runs right to left: the left arrow goes forward
    if ($('bkSurahSel').options.length) $('bkSurahSel').value = String(d.surahNames[0].number);
    if (d.juz && $('bkJuzSel').options.length) $('bkJuzSel').value = String(d.juz);
    paintBookmark();
    paintPlayingAyah();
    saveBookPage();
    scheduleBookRead();
    bookPrefetch(n + 1); bookPrefetch(n - 1);
  } catch (e) { toast(e.message, true); }
  bk.busy = false;
}
const bookNext = () => { if (bk.data && bkSt().page < bkPages()) showBookPage(bkSt().page + 1, 1); };
const bookPrev = () => { if (bk.data && bkSt().page > 1) showBookPage(bkSt().page - 1, -1); };

/* ---------- where the person stopped ---------- */
function saveBookPage() { bk.dirty = true; clearTimeout(bk.saveTimer); bk.saveTimer = setTimeout(flushBook, 1200); }
function flushBook() {
  clearTimeout(bk.saveTimer);
  if (!bk.ready || !bk.data || !bk.dirty) return;
  bk.dirty = false;
  const [s, a] = bk.data.first.split(':').map(Number);
  api(bkUrl('/book/progress'), { method: 'PUT', body: JSON.stringify({ page: bkSt().page }), keepalive: true }).catch(() => {});
  // keep the normal Quran reader at the same place too
  api('/quran/progress', { method: 'PUT', body: JSON.stringify({ surah: s, ayah: a }), keepalive: true }).then((p) => { if (typeof qState !== 'undefined') qState = p; }).catch(() => {});
}
window.addEventListener('pagehide', flushBook);

// A page counts as read after 6 seconds on screen, the same rule as the normal reader
function cancelBookRead() { clearTimeout(bk.readTimer); }
function scheduleBookRead() {
  cancelBookRead();
  const d = bk.data;
  if (!d) return;
  const mark = d.ayahs[0].key + '-' + d.ayahs[d.ayahs.length - 1].key;
  if (bk.readMarked === mark) return;
  const ranges = rangesOf(d.ayahs);
  if (ranges.length > 12) return;
  bk.readTimer = setTimeout(() => {
    api('/quran/progress', { method: 'PUT', body: JSON.stringify({ read: ranges }) }).then(() => { bk.readMarked = mark; }).catch(() => {});
  }, 6000);
}

/* ---------- bookmarks ---------- */
const isBookmarked = () => bkSt().bookmarks.some((b) => b.page === bkSt().page);
function paintBookmark() {
  const on = isBookmarked();
  $('bkMark').classList.toggle('on', on);
  $('bkMark').setAttribute('aria-pressed', on);
  $('bkMark').textContent = on ? '★ Bookmarked' : '☆ Bookmark';
}
async function toggleBookmark() {
  try {
    bkSt().bookmarks = isBookmarked()
      ? await api(bkUrl('/book/bookmarks/' + bkSt().page), { method: 'DELETE' })
      : await api(bkUrl('/book/bookmarks'), { method: 'POST', body: JSON.stringify({ page: bkSt().page }) });
    paintBookmark(); drawBookmarkList();
  } catch (e) { toast(e.message, true); }
}
function drawBookmarkList() {
  const box = $('bkMarks');
  box.replaceChildren();
  const list = bkSt().bookmarks;
  if (!list.length) { box.appendChild(mk('p', 'src', 'No bookmarks yet. Tap Bookmark to save a page.')); return; }
  list.forEach((b) => {
    const row = mk('div', 'bk-mrow');
    const go = mk('button', 'chip', `Page ${b.page}${b.surah ? ' · ' + b.surah : ''}`);
    go.onclick = () => { $('bkMarksBox').open = false; showBookPage(b.page, b.page > bkSt().page ? 1 : -1); };
    const rm = mk('button', 'link-btn', 'Remove');
    rm.setAttribute('aria-label', 'Remove bookmark for page ' + b.page);
    rm.onclick = async () => { try { bkSt().bookmarks = await api(bkUrl('/book/bookmarks/' + b.page), { method: 'DELETE' }); paintBookmark(); drawBookmarkList(); } catch (e) { toast(e.message, true); } };
    row.append(go, rm);
    box.appendChild(row);
  });
}

/* ---------- tap an ayah: Arabic, translation, play, copy ---------- */
function closeBookSheet() {
  bk.sel = null;
  $('bkSheet').classList.add('hidden');
  document.querySelectorAll('#bkStage .sel').forEach((e) => e.classList.remove('sel'));
}
async function selectBookAyah(a, el) {
  if (bk.sel && bk.sel.key === a.key) return closeBookSheet();
  document.querySelectorAll('#bkStage .sel').forEach((e) => e.classList.remove('sel'));
  el.classList.add('sel');
  bk.sel = a; bk.selArabic = a.text || '';
  $('bkSheet').classList.remove('hidden');
  $('bkSheetTitle').textContent = `Ayah ${a.key}`;
  const ar = $('bkSheetAr'); const tr = $('bkSheetTr');
  ar.textContent = a.text || '';
  tr.textContent = 'Loading…';
  try {
    const r = await api(`/book/ayah/${a.surah}/${a.number}?lang=${bk.lang === 'none' ? 'en' : bk.lang}`);
    if (!bk.sel || bk.sel.key !== a.key) return; // another ayah was tapped meanwhile
    bk.selArabic = r.arabic || a.text || '';
    ar.textContent = bk.selArabic;
    if (bk.lang === 'none') tr.textContent = 'Translation is off. Choose a language above to see it here.';
    else {
      tr.textContent = r.translation || 'No translation saved for this ayah.';
      const l = bk.meta.quran.languages.find((x) => x.code === bk.lang);
      tr.dir = l ? l.dir : 'ltr';
    }
  } catch (e) { if (bk.sel && bk.sel.key === a.key) tr.textContent = e.message; }
}
function playBookFrom(i) {
  const d = bk.data;
  if (!d) return;
  pstate.list = d.ayahs.map((a) => ({ key: a.key, audio: a.audio }));
  pstate.mode = 'book'; pstate.page = d.page; pstate.pages = bkPages(); pstate.n = d.page;
  playAyah(Math.max(0, i));
}
function paintPlayingAyah() {
  document.querySelectorAll('#bkStage .playing').forEach((e) => e.classList.remove('playing'));
  const cur = pstate.mode === 'book' && pstate.idx >= 0 && pstate.list[pstate.idx];
  if (!cur) return;
  const el = document.querySelector(`#bkStage [data-key="${cur.key}"]`);
  if (el) { el.classList.add('playing'); if (bk.layout === 'text') el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}
// Called by the player when the last ayah of the page ends
async function bookPlayEnded() {
  const keep = typeof qState !== 'undefined' && qState && qState.autoNext;
  if (keep && view === 'book' && bkSt().page < bkPages()) {
    await showBookPage(bkSt().page + 1, 1);
    playBookFrom(0);
  } else stopPlayer();
}

/* ---------- choosing a layout, setting up the screen ---------- */
function fillPickers() {
  const st = bkSt();
  const ss = $('bkSurahSel'); ss.replaceChildren();
  const js = $('bkJuzSel'); js.replaceChildren();
  $('bkPickers').classList.toggle('hidden', !st.idx);
  if (!st.idx) return;
  st.idx.surahs.forEach((s) => { const o = mk('option', '', `${s.number}. ${s.englishName} (${s.name})`); o.value = s.number; ss.appendChild(o); });
  st.idx.juz.forEach((j) => { const o = mk('option', '', `Juz ${j.number}`); o.value = j.number; js.appendChild(o); });
}

async function enterLayout(layout) {
  if (bk.busy) return;
  stopBookAudioIfOther(layout);
  flushBook();
  bk.layout = layout; bk.data = null;
  localStorage.setItem('bkLayout', layout);
  $('bkLayPrint').classList.toggle('on', layout === 'print');
  $('bkLayText').classList.toggle('on', layout === 'text');
  $('v-book').classList.toggle('bk-is-print', layout === 'print');
  const st = bkSt();
  if (!st.loaded) {
    $('bkStage').replaceChildren(mk('p', 'empty', 'Opening the book…'));
    const [prog, idx] = await Promise.all([api(bkUrl('/book/progress')), api(bkUrl('/book/index')).catch((e) => { toast(e.message, true); return null; })]);
    st.page = prog.page; st.bookmarks = prog.bookmarks; st.idx = idx; st.loaded = true;
  }
  fillPickers();
  drawBookmarkList();
  await showBookPage(st.page, 0);
}
function stopBookAudioIfOther(layout) { if (layout !== bk.layout && pstate.mode === 'book') stopPlayer(); }

async function loadBook() {
  if (!bk.meta) {
    bk.meta = await getMeta();
    const ls = $('bkLang'); ls.replaceChildren();
    [{ code: 'none', name: 'Translation off' }, ...bk.meta.quran.languages].forEach((l) => { const o = mk('option', '', l.name); o.value = l.code; ls.appendChild(o); });
    try { const q = await getQState(); if (q.lang && q.lang !== 'none') bk.lang = q.lang; } catch (e) { /* ignore */ }
    ls.value = bk.lang;
    bk.size = Number(localStorage.getItem('bkSize')) || 2;
  }
  bk.ready = true;
  await enterLayout(localStorage.getItem('bkLayout') === 'text' ? 'text' : 'print');
}

function initBook() {
  $('bkLeft').onclick = bookNext; // buttons sit like the book: the left arrow turns forward
  $('bkRight').onclick = bookPrev;
  $('bkLeft').setAttribute('aria-label', 'Next page'); $('bkRight').setAttribute('aria-label', 'Previous page');
  $('bkLayPrint').onclick = () => { if (bk.layout !== 'print') enterLayout('print'); };
  $('bkLayText').onclick = () => { if (bk.layout !== 'text') enterLayout('text'); };
  $('bkMark').onclick = toggleBookmark;
  $('bkSurahSel').onchange = () => { const s = bkSt().idx.surahs[Number($('bkSurahSel').value) - 1]; showBookPage(s.page, s.page > bkSt().page ? 1 : -1); };
  $('bkJuzSel').onchange = () => { const j = bkSt().idx.juz[Number($('bkJuzSel').value) - 1]; showBookPage(j.page, j.page > bkSt().page ? 1 : -1); };
  $('bkGo').onclick = () => {
    const n = Number($('bkPageNo').value);
    if (!Number.isInteger(n) || n < 1 || n > bkPages()) { toast(`Type a page from 1 to ${bkPages()}`, true); $('bkPageNo').value = bkSt().page; return; }
    showBookPage(n, n > bkSt().page ? 1 : -1);
  };
  $('bkPageNo').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('bkGo').click(); });
  $('bkLang').onchange = () => {
    bk.lang = $('bkLang').value;
    if (bk.lang !== 'none') api('/quran/progress', { method: 'PUT', body: JSON.stringify({ lang: bk.lang }) }).catch(() => {});
    if (bk.sel) { const a = bk.sel; const el = document.querySelector(`#bkStage [data-key="${a.key}"]`); bk.sel = null; if (el) selectBookAyah(a, el); }
  };
  const size = (d) => {
    bk.size = Math.min(3.2, Math.max(1.3, Math.round((bk.size + d) * 10) / 10));
    localStorage.setItem('bkSize', bk.size);
    const s = $('bkStage').firstElementChild; if (s && bk.layout === 'text') s.style.fontSize = bk.size + 'rem';
  };
  $('bkFontMinus').onclick = () => size(-0.2);
  $('bkFontPlus').onclick = () => size(0.2);
  $('bkNight').onclick = () => { const on = $('v-book').classList.toggle('bk-night'); $('bkNight').setAttribute('aria-pressed', on); localStorage.setItem('bkNight', on ? '1' : ''); };
  if (localStorage.getItem('bkNight')) { $('v-book').classList.add('bk-night'); $('bkNight').setAttribute('aria-pressed', 'true'); }
  $('bkPlayPage').onclick = () => playBookFrom(0);
  $('bkSheetPlay').onclick = () => { if (!bk.sel || !bk.data) return; playBookFrom(bk.data.ayahs.findIndex((a) => a.key === bk.sel.key)); };
  $('bkSheetCopy').onclick = async () => {
    if (!bk.sel) return;
    try { await navigator.clipboard.writeText(`${bk.selArabic} ﴿${toArabicDigits(bk.sel.number)}﴾ (${bk.sel.key})`); toast('Ayah copied'); } catch { toast('Could not copy', true); }
  };
  $('bkSheetClose').onclick = closeBookSheet;

  // Swipe: finger moves left to right = next page, like turning a right-to-left book
  const stage = $('bkStage');
  let x0 = null; let y0 = 0;
  stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; const dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx > 0 ? bookNext : bookPrev)();
  }, { passive: true });
  document.addEventListener('keydown', (e) => {
    if (view !== 'book' || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') bookNext();
    else if (e.key === 'ArrowRight') bookPrev();
  });
}
