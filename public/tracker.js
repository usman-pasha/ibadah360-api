/* Ibadah360 web app. This file only shows what the server sends. All rules, content and
   calculations (prayer times, Islamic dates, Quran, duas, streaks) live in the Node.js backend. */
const token = localStorage.getItem('token');
if (!token) location.href = 'index.html';

const $ = (id) => document.getElementById(id);
const mk = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

let view = 'dashboard';
let calMonth = 'current';
let selected = null;
let missedPage = 1;

/* ---------- talking to the server ---------- */
async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
      'X-TZ-Offset': new Date().getTimezoneOffset(),
    },
  });
  if (res.status === 401) { localStorage.clear(); location.href = 'index.html'; throw new Error('Logged out'); }
  let data;
  try { data = await res.json(); }
  catch { throw new Error('The server did not answer correctly. Restart it with npm start, then refresh the page'); }
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

let metaCache = null;
async function getMeta() {
  if (!metaCache) metaCache = await api('/meta');
  return metaCache;
}

/* ---------- toast, confirmation box ---------- */
let toastTimer;
function toast(msg, isError) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = mk('div', 'toast' + (isError ? ' err' : ''), msg);
  t.setAttribute('role', 'status');
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 3500);
}

function confirmBox(title, text, okLabel) {
  return new Promise((resolve) => {
    $('mTitle').textContent = title;
    $('mText').textContent = text;
    $('mOk').textContent = okLabel;
    $('modal').classList.remove('hidden');
    $('mCancel').focus(); // safest default for a permanent action
    const done = (v) => { $('modal').classList.add('hidden'); resolve(v); };
    $('mOk').onclick = () => done(true);
    $('mCancel').onclick = () => done(false);
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('modal').classList.contains('hidden')) $('mCancel').click();
});

/* ---------- menu and page buttons ---------- */
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

// Page numbers. The server decides the pages, this only draws the buttons.
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

/* ---------- prayer rows (Today and the calendar day panel) ---------- */
const ACTION = { ontime: ['On time', 'act on'], qaza: ['Qaza', 'act qz'], undo: ['Undo', 'act undo'] };

function renderRows(el, day) {
  el.replaceChildren();
  day.prayers.forEach((p) => {
    const info = mk('div', 'pinfo');
    const ar = mk('span', 'ar', p.ar); ar.lang = 'ar';
    info.append(mk('span', 'name', p.name), ar);
    if (p.startsLabel) info.appendChild(mk('span', 'time', p.startsLabel));
    const box = mk('div', 'actions');
    if (p.waiting) box.appendChild(mk('span', 'badge soft', 'Starts ' + p.startsLabel));
    else if (p.status === 'ontime') box.appendChild(mk('span', 'badge', 'On time · locked'));
    else if (p.status === 'qaza') box.appendChild(mk('span', 'badge', 'Qaza'));
    p.actions.forEach((a) => {
      const b = mk('button', ACTION[a][1], ACTION[a][0]);
      b.onclick = () => act(day, p, a);
      box.appendChild(b);
    });
    const row = mk('div', 'prayer ' + (p.status || ''));
    row.append(mk('span', 'tick', '✓'), info, box);
    el.appendChild(row);
  });
}

function renderNafl(el, day) {
  el.replaceChildren();
  day.nafl.forEach((n) => {
    const info = mk('div', 'pinfo');
    const ar = mk('span', 'ar', n.ar); ar.lang = 'ar';
    info.append(mk('span', 'name', n.name), ar, mk('span', 'tip', n.tip));
    const box = mk('div', 'actions');
    if (n.done) box.appendChild(mk('span', 'badge', 'Prayed · locked'));
    else if (n.canMark) {
      const b = mk('button', 'act on', 'Mark prayed');
      b.onclick = () => markNafl(day, n);
      box.appendChild(b);
    } else box.appendChild(mk('span', 'badge soft', 'Not marked'));
    const row = mk('div', 'prayer ' + (n.done ? 'ontime' : ''));
    row.append(mk('span', 'tick', '✓'), info, box);
    el.appendChild(row);
  });
}

async function act(day, p, a) {
  const when = day.isToday ? 'today' : day.label;
  const [title, text, ok] = {
    ontime: [`Prayed ${p.name} on time?`, `This will be saved as on time for ${when}. Once confirmed it is locked and cannot be changed or removed.`, 'Yes, on time'],
    qaza: [`Mark ${p.name} as qaza?`, `${p.name} of ${when} will be saved as made up (qaza).`, 'Mark qaza'],
    undo: [`Remove qaza for ${p.name}?`, `${p.name} of ${when} will go back to missed.`, 'Remove'],
  }[a];
  if (!(await confirmBox(title, text, ok))) return;
  try {
    if (a === 'undo') await api(`/prayers/${day.date}/undo`, { method: 'POST', body: JSON.stringify({ prayer: p.key }) });
    else await api(`/prayers/${day.date}/mark`, { method: 'POST', body: JSON.stringify({ prayer: p.key, status: a }) });
    toast({ ontime: `${p.name} saved as on time`, qaza: `${p.name} saved as qaza`, undo: `${p.name} qaza removed` }[a]);
    setTimeout(checkBadges, 1500);
  } catch (e) { toast(e.message, true); }
  loadView();
}

async function markNafl(day, n) {
  const ok = await confirmBox(`Prayed ${n.name}?`, `This will be saved for ${day.isToday ? 'today' : day.label}. Once confirmed it is locked and cannot be removed.`, 'Yes, I prayed');
  if (!ok) return;
  try {
    await api(`/prayers/${day.date}/nafl`, { method: 'POST', body: JSON.stringify({ prayer: n.key }) });
    toast(`${n.name} saved. May Allah accept it`);
    setTimeout(checkBadges, 1500);
  } catch (e) { toast(e.message, true); }
  loadView();
}

/* ---------- views ---------- */
async function loadToday() {
  const d = await api('/prayers/today');
  $('todayDate').textContent = d.label;
  $('hijriToday').textContent = d.hijri.text + (d.hijri.events.length ? ' · ' + d.hijri.events.join(', ') : '') + (d.hijri.eid ? ' · Eid Mubarak!' : '');
  $('done').textContent = d.done;
  $('streak').textContent = d.streak;
  $('fill').style.width = (d.done / d.total) * 100 + '%';
  renderRows($('todayRows'), d);
  renderNafl($('naflRow'), d);
}

async function loadCalendar() {
  const m = await api('/prayers/month/' + calMonth);
  calMonth = m.month;
  $('monthLabel').textContent = m.label;
  $('nextM').disabled = !m.canNext;
  $('prevM').onclick = () => { calMonth = m.prevMonth; selected = null; loadCalendar(); };
  $('nextM').onclick = () => { calMonth = m.nextMonth; selected = null; loadCalendar(); };

  if (!selected || !selected.startsWith(m.month)) selected = (m.days.find((d) => d.today) || {}).date || null;

  const grid = $('cal');
  grid.replaceChildren();
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((w) => grid.appendChild(mk('div', 'wd', w)));
  for (let i = 0; i < m.firstWeekday; i++) grid.appendChild(mk('div'));
  m.days.forEach((d) => {
    let cls = 'cell';
    if (d.level === 'future') cls += ' future';
    else if (d.level !== 'none') cls += ' ' + d.level;
    if (d.missed) cls += ' miss';
    if (d.today) cls += ' today';
    if (d.nafl) cls += ' tj';
    if (d.date === selected) cls += ' sel';
    const b = mk('button', cls);
    b.disabled = d.level === 'future';
    b.setAttribute('aria-label', `${d.day}, ${d.count} of 5 prayed`);
    b.append(String(d.day), mk('small', '', `${d.count}/5`));
    b.onclick = () => { selected = d.date; loadCalendar(); };
    grid.appendChild(b);
  });

  if (selected) {
    const day = await api('/prayers/day/' + selected);
    $('dayTitle').textContent = day.label;
    $('dayHijri').textContent = day.hijri.text;
    renderRows($('calRows'), day);
    renderNafl($('calNafl'), day);
  } else {
    $('dayTitle').textContent = 'Select a day to see its prayers';
    $('dayHijri').textContent = '';
    $('calRows').replaceChildren();
    $('calNafl').replaceChildren();
  }
}

async function markAll(day) {
  const ok = await confirmBox(`Mark ${day.prayers.length} prayers as qaza?`, `All missed prayers of ${day.label} will be saved as qaza.`, 'Mark all qaza');
  if (!ok) return;
  try {
    for (const p of day.prayers) await api(`/prayers/${day.date}/mark`, { method: 'POST', body: JSON.stringify({ prayer: p.key, status: 'qaza' }) });
    toast('Saved as qaza');
  } catch (e) { toast(e.message, true); }
  loadView();
}

async function loadMissed() {
  const r = await api(`/prayers/missed?page=${missedPage}&limit=5`);
  missedPage = r.page;
  $('missedTotal').textContent = r.total ? `${r.total} missed prayer${r.total > 1 ? 's' : ''} to make up` : 'No missed prayers';
  const box = $('missedList');
  box.replaceChildren();
  if (!r.days.length) {
    box.appendChild(mk('p', 'empty', 'Nothing to make up in the last 60 days. Alhamdulillah.'));
    $('missedPager').replaceChildren();
    return;
  }
  r.days.forEach((day) => {
    const head = mk('div', 'mday-h');
    head.appendChild(mk('h3', '', day.label));
    if (day.prayers.length > 1) {
      const all = mk('button', 'link-btn', 'Mark all qaza');
      all.onclick = () => markAll(day);
      head.appendChild(all);
    }
    const chips = mk('div', 'chips');
    day.prayers.forEach((p) => {
      const c = mk('button', 'chip', `${p.name} · mark qaza`);
      c.onclick = () => act({ date: day.date, label: day.label, isToday: false }, p, 'qaza');
      chips.appendChild(c);
    });
    const el = mk('div', 'mday');
    el.append(head, chips);
    box.appendChild(el);
  });
  renderPager($('missedPager'), r.page, r.pages, (p) => { missedPage = p; loadMissed(); });
}

async function loadView() {
  if (view !== 'tasbih') flushTasbih();
  if (view !== 'quran') { flushQuranSave(); cancelReadMark(); } // save where the person stopped reading
  document.querySelectorAll('.nav-item').forEach((t) => {
    const active = view === 'user' ? (userRoot ? 'myprofile' : 'people') : view === 'lesson' ? 'course' : view === 'editprofile' ? 'myprofile' : view;
    const on = t.dataset.view === active;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on);
  });
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('hidden', v.id !== 'v-' + view));
  const loaders = {
    dashboard: loadDashboard, today: loadToday, times: loadTimesView, hijri: loadHijri, report: loadReport, course: loadCourse, lesson: loadLesson, learn: loadLearn,
    quran: loadQuran, editprofile: loadEditProfile, account: loadAccount, about: loadAbout,
    people: loadPeopleView, user: loadUser,
    ramadan: loadRamadan, qaza: loadQaza, badges: loadBadges, tasbih: loadTasbih, zakat: loadZakat, masjids: loadMasjids,
    calendar: () => Promise.all([loadCalendar(), loadMissed()]),
  };
  try { await loaders[view](); }
  catch (e) { if (e.message !== 'Logged out') toast(e.message, true); }
}

/* ---------- start ---------- */
document.querySelectorAll('.nav-item').forEach((t) => {
  t.onclick = () => {
    if (t.dataset.view === 'myprofile') { closeDrawer(); openOwnProfile(); return; }
    view = t.dataset.view; closeDrawer(); window.scrollTo(0, 0); loadView();
  };
});
$('menuBtn').onclick = () => ($('drawer').classList.contains('open') ? closeDrawer() : openDrawer());
$('scrim').onclick = closeDrawer;
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
$('logout').onclick = () => { localStorage.clear(); location.href = 'index.html'; };

// Refresh each minute so "Starts 4:30 pm" turns into buttons by itself
setInterval(() => {
  if ((['dashboard', 'today', 'times'].includes(view)) && $('modal').classList.contains('hidden')) loadView();
  refreshBadge();
}, 60000);

initLearn();
initHijri();
initTimes();
initProfile();
initSocial();
initReport();
initCourse();
initTools();
initWorship();
refreshBadge();
loadView();
