/* Islamic (Hijri) calendar. Uses the browser's built-in Umm al-Qura calendar. */
const HMONTHS = ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhul Qa'dah", 'Dhul Hijjah'];
const HEVENTS = [
  { m: 1, d: 1, name: 'Islamic New Year', note: 'First day of Muharram and of the new Hijri year.' },
  { m: 1, d: 10, name: 'Day of Ashura', note: 'Fasting on this day is recommended.' },
  { m: 3, d: 12, name: 'Mawlid an-Nabi', note: 'Birth of the Prophet ﷺ, observed by many Muslims.' },
  { m: 7, d: 27, name: "Isra and Mi'raj", note: 'The Night Journey and Ascension, observed by many Muslims.' },
  { m: 8, d: 15, name: "Mid-Sha'ban (Shab-e-Barat)", note: 'Observed by many Muslims with prayer and dua.' },
  { m: 9, d: 1, name: 'First day of Ramadan', note: 'The month of fasting begins.' },
  { m: 9, d: 21, name: 'Last ten nights of Ramadan begin', note: 'Seek Laylat al-Qadr on the odd nights.' },
  { m: 9, d: 27, name: 'Laylat al-Qadr (27th night)', note: 'Commonly observed. It is sought on the odd nights of the last ten.' },
  { m: 10, d: 1, name: 'Eid al-Fitr', eid: true, note: 'Festival at the end of Ramadan. Eid prayer, Zakat al-Fitr and celebration.' },
  { m: 12, d: 1, name: 'First ten days of Dhul Hijjah', note: 'Days of great reward for good deeds.' },
  { m: 12, d: 9, name: 'Day of Arafah', note: 'Fasting is recommended for those who are not on Hajj.' },
  { m: 12, d: 10, name: 'Eid al-Adha', eid: true, note: 'Festival of sacrifice. Eid prayer and Qurbani.' },
  { m: 12, d: 11, name: 'Days of Tashreeq begin', note: 'The 11th to 13th. Days of eating, drinking and remembering Allah.' },
];

let hv = null;   // { first: Date } first day of the month on screen
let hSel = null; // selected day index in that month
let _hok = null;
let _hfmt = null;

function hijriOk() {
  if (_hok === null) {
    try {
      const y = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric' })
        .formatToParts(new Date()).find((p) => p.type === 'year');
      _hok = !!y && Number(y.value) < 1700; // a Gregorian year (2026) means the calendar is unsupported
    } catch { _hok = false; }
  }
  return _hok;
}
const hAdj = () => Number(prefs.hijriAdj);
const addG = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function hijriOf(date) {
  if (!_hfmt) _hfmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
  const o = {};
  _hfmt.formatToParts(addG(date, hAdj())).forEach((p) => { if (['day', 'month', 'year'].includes(p.type)) o[p.type[0]] = Number(p.value); });
  return o; // { d, m, y }
}
const eventsOn = (h) => HEVENTS.filter((e) => e.m === h.m && e.d === h.d);
const fmtH = (h) => `${h.d} ${HMONTHS[h.m - 1]} ${h.y} AH`;
const monthLen = (first) => { const m = hijriOf(first).m; let n = 0; while (n < 31 && hijriOf(addG(first, n)).m === m) n++; return n; };

function showHijriToday() {
  const el = $('hijriToday');
  if (!hijriOk()) { el.textContent = ''; return; }
  const h = hijriOf(new Date());
  const ev = eventsOn(h);
  el.textContent = fmtH(h) + (ev.length ? ' · ' + ev.map((e) => e.name).join(', ') : '') + (ev.some((e) => e.eid) ? ' · Eid Mubarak!' : '');
}

function hijriInit() {
  const t = new Date();
  hv = { first: addG(t, -(hijriOf(t).d - 1)) };
  hSel = null;
}

function hijriMove(dir) {
  if (dir > 0) hv.first = addG(hv.first, monthLen(hv.first));
  else { const last = addG(hv.first, -1); hv.first = addG(last, -(hijriOf(last).d - 1)); }
  hSel = null;
  loadHijri();
}

function loadHijri() {
  const grid = $('hGrid');
  if (!hijriOk()) { grid.textContent = 'Your browser does not support the Islamic calendar. Please update your browser.'; return; }
  if (!hv) hijriInit();
  const h0 = hijriOf(hv.first);
  const len = monthLen(hv.first);
  const lastG = addG(hv.first, len - 1);
  const mfmt = { month: 'short', year: 'numeric' };
  $('hLabel').textContent = `${HMONTHS[h0.m - 1]} ${h0.y} AH`;
  $('hSub').textContent = hv.first.toLocaleDateString('en-IN', mfmt) + ' to ' + lastG.toLocaleDateString('en-IN', mfmt);

  const now = new Date();
  let sel = hSel;
  if (sel === null) { sel = -1; for (let i = 0; i < len; i++) if (sameDay(addG(hv.first, i), now)) sel = i; }

  grid.replaceChildren();
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((w) => grid.appendChild(mk('div', 'wd', w)));
  for (let i = 0; i < hv.first.getDay(); i++) grid.appendChild(mk('div'));
  for (let i = 0; i < len; i++) {
    const g = addG(hv.first, i);
    const h = hijriOf(g);
    const ev = eventsOn(h);
    let cls = 'cell hcell';
    if (ev.some((e) => e.eid)) cls += ' eid'; else if (ev.length) cls += ' ev';
    if ([13, 14, 15].includes(h.d)) cls += ' white';
    if (g.getDay() === 5) cls += ' fri';
    if (sameDay(g, now)) cls += ' today';
    if (i === sel) cls += ' sel';
    const b = mk('button', cls);
    b.append(mk('span', '', String(h.d)), mk('small', '', String(g.getDate())));
    b.setAttribute('aria-label', `${fmtH(h)}, ${g.toDateString()}${ev.length ? ', ' + ev.map((e) => e.name).join(', ') : ''}`);
    b.onclick = () => { hSel = i; loadHijri(); };
    grid.appendChild(b);
  }

  // selected day details
  const body = $('hDayBody');
  body.replaceChildren();
  if (sel < 0) { $('hDayTitle').textContent = 'Select a day'; }
  else {
    const g = addG(hv.first, sel);
    const h = hijriOf(g);
    $('hDayTitle').textContent = g.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    body.appendChild(mk('p', 'src', fmtH(h)));
    const notes = eventsOn(h).map((e) => [e.name, e.note]);
    if ([13, 14, 15].includes(h.d)) notes.push(['White days (Ayyam al-Bidh)', 'The 13th, 14th and 15th of each month. Fasting is recommended.']);
    if (g.getDay() === 5) notes.push(["Jumu'ah (Friday)", 'The weekly day of gathering. The congregational prayer takes the place of Dhuhr.']);
    if (!notes.length) body.appendChild(mk('p', 'hint', 'No special day.'));
    notes.forEach(([n, t]) => { const c = mk('div', 'card'); c.append(mk('h3', '', n), mk('p', '', t)); body.appendChild(c); });
  }

  // coming up
  const up = $('hUpcoming');
  up.replaceChildren();
  let found = 0;
  for (let i = 0; i < 400 && found < 8; i++) {
    const g = addG(now, i);
    eventsOn(hijriOf(g)).forEach((e) => {
      found++;
      const row = mk('div', 'stat');
      const left = mk('span');
      left.append(mk('b', e.eid ? 'eid-tag' : '', e.name), mk('br'), mk('small', 'src', `${fmtH(hijriOf(g))} · ${g.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`));
      row.append(left, mk('span', 'src', i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `in ${i} days`));
      up.appendChild(row);
    });
  }
}

function initHijri() {
  $('hPrev').onclick = () => hv && hijriMove(-1);
  $('hNext').onclick = () => hv && hijriMove(1);
  $('hToday').onclick = () => { hijriInit(); loadHijri(); };
  $('hGoProfile').onclick = () => { view = 'profile'; window.scrollTo(0, 0); loadView(); };
}
