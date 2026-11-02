const token = localStorage.getItem('token');
if (!token) location.href = 'index.html';

const PRAYERS = [
  { key: 'fajr', name: 'Fajr', ar: 'الفجر' },
  { key: 'dhuhr', name: 'Dhuhr', ar: 'الظهر' },
  { key: 'asr', name: 'Asr', ar: 'العصر' },
  { key: 'maghrib', name: 'Maghrib', ar: 'المغرب' },
  { key: 'isha', name: 'Isha', ar: 'العشاء' },
];
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => fmt(new Date()); // local day, recalculated each time
const nice = (s) =>
  new Date(s + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const blank = (date) => ({ date, ...Object.fromEntries(PRAYERS.map((p) => [p.key, null])) });

let view = 'today';
let cal = { y: new Date().getFullYear(), m: new Date().getMonth() };
let selected = today();
const ym = () => `${cal.y}-${pad(cal.m + 1)}`;

/* ---------- api, toast, confirmation ---------- */
async function api(path, options = {}) {
  const res = await fetch('/api/prayers' + path, {
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

let toastTimer;
function toast(msg, isError) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' err' : '');
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 3000);
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

/* ---------- prayer rows (used by Today and Calendar) ---------- */
const toMin = (t) => { const [h, m] = t.slice(0, 5).split(':').map(Number); return h * 60 + m; };
const show12 = (t) => {
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

function renderRows(el, data) {
  const isToday = data.date === today();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  el.innerHTML = '';
  PRAYERS.forEach((p) => {
    const st = data[p.key];
    const tm = isToday && times ? times[p.key] : null;
    const notYet = !st && tm && nowMin < toMin(tm);
    let actions = '';
    if (notYet) {
      actions = `<span class="badge soft">Starts ${show12(tm)}</span>`;
    } else if (!st) {
      if (isToday) actions += '<button class="act on" data-a="ontime">On time</button>';
      actions += '<button class="act qz" data-a="qaza">Qaza</button>';
    } else if (st === 'ontime') {
      actions = '<span class="badge">On time · locked</span>';
    } else {
      actions = '<span class="badge">Qaza</span><button class="act undo" data-a="undo">Undo</button>';
    }
    const row = document.createElement('div');
    row.className = 'prayer ' + (st || '');
    row.innerHTML =
      `<span class="tick">✓</span><div class="pinfo"><span class="name">${p.name}</span>` +
      `<span class="ar" lang="ar">${p.ar}</span>${tm ? `<span class="time">${show12(tm)}</span>` : ''}</div>` +
      `<div class="actions">${actions}</div>`;
    row.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => act(data.date, p, b.dataset.a)));
    el.appendChild(row);
  });
}

async function act(date, p, a) {
  const when = date === today() ? 'today' : nice(date);
  const [title, text, ok] = {
    ontime: [`Prayed ${p.name} on time?`, `This will be saved as on time for ${when}. Once confirmed it is locked and cannot be changed or removed.`, 'Yes, on time'],
    qaza: [`Mark ${p.name} as qaza?`, `${p.name} of ${when} will be saved as made up (qaza).`, 'Mark qaza'],
    undo: [`Remove qaza for ${p.name}?`, `${p.name} of ${when} will go back to missed.`, 'Remove'],
  }[a];
  if (!(await confirmBox(title, text, ok))) return;
  try {
    if (a === 'undo') await api(`/${date}/undo`, { method: 'POST', body: JSON.stringify({ prayer: p.key }) });
    else await api(`/${date}/mark`, { method: 'POST', body: JSON.stringify({ prayer: p.key, status: a }) });
    toast({ ontime: `${p.name} saved as on time`, qaza: `${p.name} saved as qaza`, undo: `${p.name} qaza removed` }[a]);
    loadView();
  } catch (e) {
    toast(e.message, true);
    loadView();
  }
}

/* ---------- views ---------- */
async function loadToday() {
  const [d, s] = await Promise.all([api('/' + today()), api('/stats'), loadTimes()]);
  const n = PRAYERS.filter((p) => d[p.key]).length;
  $('todayDate').textContent = nice(today());
  $('done').textContent = n;
  $('streak').textContent = s.streak;
  $('fill').style.width = (n / 5) * 100 + '%';
  renderRows($('todayRows'), d);
  renderTahajjud($('tahajjudRow'), d);
}

async function loadCalendar() {
  const days = await api('/month/' + ym());
  const map = Object.fromEntries(days.map((d) => [d.date, d]));
  const now = new Date();
  $('monthLabel').textContent = new Date(cal.y, cal.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  $('nextM').disabled = cal.y === now.getFullYear() && cal.m >= now.getMonth();

  const grid = $('cal');
  grid.innerHTML = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w) => `<div class="wd">${w}</div>`).join('');
  const lead = new Date(cal.y, cal.m, 1).getDay();
  for (let i = 0; i < lead; i++) grid.insertAdjacentHTML('beforeend', '<div></div>');

  const total = new Date(cal.y, cal.m + 1, 0).getDate();
  for (let day = 1; day <= total; day++) {
    const date = `${ym()}-${pad(day)}`;
    const d = map[date] || blank(date);
    const n = PRAYERS.filter((p) => d[p.key]).length;
    const allOn = PRAYERS.every((p) => d[p.key] === 'ontime');
    const future = date > today();
    let cls = 'cell';
    if (future) cls += ' future';
    else {
      if (allOn) cls += ' full';
      else if (n === 5) cls += ' made';
      else if (n > 0) cls += ' part';
      if (date < today() && n < 5) cls += ' miss';
    }
    if (date === today()) cls += ' today';
    if (d.tahajjud) cls += ' tj';
    if (date === selected) cls += ' sel';
    const b = document.createElement('button');
    b.className = cls;
    b.disabled = future;
    b.setAttribute('aria-label', `${nice(date)}, ${n} of 5 prayed`);
    b.innerHTML = `${day}<small>${n}/5</small>`;
    b.onclick = () => { selected = date; loadCalendar(); };
    grid.appendChild(b);
  }

  const showing = selected && selected.startsWith(ym());
  $('dayTitle').textContent = showing ? nice(selected) : 'Select a day to see its prayers';
  $('calRows').innerHTML = '';
  $('calTahajjud').innerHTML = '';
  if (showing) {
    const day = map[selected] || blank(selected);
    renderRows($('calRows'), day);
    renderTahajjud($('calTahajjud'), day);
  }
}

async function markAll(day) {
  const ok = await confirmBox(`Mark ${day.prayers.length} prayers as qaza?`, `All missed prayers of ${nice(day.date)} will be saved as qaza.`, 'Mark all qaza');
  if (!ok) return;
  try {
    for (const key of day.prayers) {
      await api(`/${day.date}/mark`, { method: 'POST', body: JSON.stringify({ prayer: key, status: 'qaza' }) });
    }
    toast('Saved as qaza');
  } catch (e) { toast(e.message, true); }
  loadView();
}

async function loadMissed() {
  const r = await api('/missed');
  $('missedTotal').textContent = r.total
    ? `${r.total} missed prayer${r.total > 1 ? 's' : ''} to make up`
    : 'No missed prayers';
  const box = $('missedList');
  box.innerHTML = '';
  $('missedPager').replaceChildren();
  if (!r.days.length) {
    box.innerHTML = '<p class="empty">Nothing to make up in the last 60 days. Alhamdulillah.</p>';
    return;
  }
  const per = 5;
  const pages = Math.ceil(r.days.length / per);
  missedPage = Math.min(missedPage, pages);
  r.days.slice((missedPage - 1) * per, missedPage * per).forEach((day) => {
    const el = document.createElement('div');
    el.className = 'mday';
    el.innerHTML = `<div class="mday-h"><h3>${nice(day.date)}</h3></div><div class="chips"></div>`;
    if (day.prayers.length > 1) {
      const all = document.createElement('button');
      all.className = 'link-btn';
      all.textContent = 'Mark all qaza';
      all.onclick = () => markAll(day);
      el.querySelector('.mday-h').appendChild(all);
    }
    day.prayers.forEach((key) => {
      const p = PRAYERS.find((x) => x.key === key);
      const c = document.createElement('button');
      c.className = 'chip';
      c.textContent = `${p.name} · mark qaza`;
      c.onclick = () => act(day.date, p, 'qaza');
      el.querySelector('.chips').appendChild(c);
    });
    box.appendChild(el);
  });
  renderPager($('missedPager'), missedPage, pages, (p) => { missedPage = p; loadMissed(); });
}

async function loadStats() {
  const s = await api('/stats');
  const rows = [
    ['Current streak (all 5 on time)', `${s.streak} day${s.streak === 1 ? '' : 's'}`],
    ['Best streak', `${s.best} day${s.best === 1 ? '' : 's'}`],
    ['Prayed on time', s.ontime],
    ['Made up as qaza', s.qaza],
    ['Still missed', s.missed],
    ['On time, last 30 days', s.percent === null ? '–' : s.percent + '%'],
    ['Tahajjud nights', s.tahajjud],
    ['Tahajjud streak', `${s.tahajjudStreak} night${s.tahajjudStreak === 1 ? '' : 's'}`],
  ];
  $('stats').innerHTML = rows.map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
  $('missedBy').innerHTML = PRAYERS.map((p) => `<div class="stat"><span>${p.name}</span><b>${s.missedBy[p.key]}</b></div>`).join('');
}

async function loadView() {
  document.querySelectorAll('.nav-item').forEach((t) => {
    const on = t.dataset.view === view;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on);
  });
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('hidden', v.id !== 'v-' + view));
  try {
    await { today: loadToday, calendar: loadCalendar, missed: loadMissed, stats: loadStats, learn: loadLearn, quran: loadQuran, about: loadAbout }[view]();
  } catch (e) {
    if (e.message !== 'Logged out') toast(e.message, true);
  }
}

/* ---------- events ---------- */
document.querySelectorAll('.nav-item').forEach((t) => (t.onclick = () => { view = t.dataset.view; closeDrawer(); window.scrollTo(0, 0); loadView(); }));
const moveMonth = (n) => {
  const d = new Date(cal.y, cal.m + n, 1);
  cal = { y: d.getFullYear(), m: d.getMonth() };
  selected = null;
  loadCalendar();
};
$('prevM').onclick = () => moveMonth(-1);
$('nextM').onclick = () => moveMonth(1);
$('logout').onclick = () => { localStorage.clear(); location.href = 'index.html'; };
$('hello').textContent = 'Assalamu alaikum, ' + (localStorage.getItem('name') || '');

/* ---------- prayer times (aladhan.com) ---------- */
let times = null;
let timesWarned = false;

async function loadTimes() {
  const city = localStorage.getItem('city');
  const country = localStorage.getItem('country');
  times = null;
  if (!city || !country) return;
  const school = localStorage.getItem('school') || '0';
  Object.keys(localStorage)
    .filter((k) => k.startsWith('times|') && !k.startsWith('times|' + today()))
    .forEach((k) => localStorage.removeItem(k));
  const key = `times|${today()}|${city}|${country}|${school}`;
  try {
    const cached = localStorage.getItem(key);
    if (cached) { times = JSON.parse(cached); return; }
    const [y, m, d] = today().split('-');
    const url = `https://api.aladhan.com/v1/timingsByCity/${d}-${m}-${y}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&school=${school}`;
    const r = await fetch(url);
    const j = await r.json();
    if (!r.ok || !j.data) throw new Error('bad response');
    const x = j.data.timings;
    times = { fajr: x.Fajr, dhuhr: x.Dhuhr, asr: x.Asr, maghrib: x.Maghrib, isha: x.Isha };
    localStorage.setItem(key, JSON.stringify(times));
    timesWarned = false;
  } catch {
    times = null;
    if (!timesWarned) { timesWarned = true; toast('Could not load prayer times. Check the city and country', true); }
  }
}

$('city').value = localStorage.getItem('city') || '';
$('country').value = localStorage.getItem('country') || '';
$('school').value = localStorage.getItem('school') || '0';
$('saveCity').onclick = () => {
  const c = $('city').value.trim();
  const k = $('country').value.trim();
  if (!c || !k) return toast('Enter both city and country', true);
  localStorage.setItem('city', c);
  localStorage.setItem('country', k);
  localStorage.setItem('school', $('school').value);
  timesWarned = false;
  toast('Prayer times saved');
  loadToday().catch((e) => toast(e.message, true));
};
$('clearCity').onclick = () => {
  ['city', 'country', 'school'].forEach((k) => localStorage.removeItem(k));
  $('city').value = ''; $('country').value = ''; $('school').value = '0';
  toast('Prayer times removed');
  loadToday().catch((e) => toast(e.message, true));
};

// Refresh each minute so "Starts 4:30 PM" turns into buttons by itself
setInterval(() => {
  if (view === 'today' && $('modal').classList.contains('hidden')) loadToday().catch(() => {});
}, 60000);

initLearn();
loadView();
