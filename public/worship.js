/* Ramadan, Qaza goal and Achievements. The server decides every number. */
const BADGE_GROUPS = { streak: 'Streaks', prayer: 'Prayers on time', qaza: 'Qaza', night: 'Tahajjud', quran: 'Quran', learn: 'Learning', dhikr: 'Dhikr', ramadan: 'Ramadan' };
const REASON_NAMES = { sick: 'Sick', travel: 'Travelling', period: 'Period', pregnancy: 'Pregnant or nursing', other: 'Other reason' };
let rmSel = null;
let qzEditing = false;

// Tell the person when a new badge was earned
async function checkBadges() {
  try {
    const b = await api('/badges');
    if (b.newlyEarned.length) toast('New badge: ' + b.newlyEarned.map((x) => x.title).join(', '));
  } catch (e) { /* ignore */ }
}

/* ---------- Ramadan ---------- */
function drawRamadan(r) {
  const out = [];
  if (!r.supported) { $('rmBody').replaceChildren(mk('p', 'empty', 'This server cannot work out Islamic dates. Please use Node.js 18 or newer.')); return; }

  const hero = mk('div', 'dcard hero');
  if (r.active) {
    hero.append(mk('h3', '', r.label), mk('p', 'big', `Day ${r.dayNumber} of ${r.dayCount}`));
    if (r.times) {
      hero.append(mk('p', '', `Sehri ends ${r.times.sehri.label} · Iftar ${r.times.iftar.label}`), mk('p', '', `${r.times.next.name} in ${r.times.next.inLabel}`));
      if (r.times.imsak) hero.appendChild(mk('p', 'src light-text', `Imsak ${r.times.imsak.label}`));
    } else hero.appendChild(mk('p', '', 'Prayer times could not load, so sehri and iftar times are not shown.'));
  } else {
    hero.append(mk('h3', '', 'Ramadan mode'), mk('p', 'big', `Ramadan starts in ${r.nextRamadan.daysUntil} days`), mk('p', '', r.nextRamadan.label));
    hero.appendChild(mk('p', 'src light-text', 'Sehri and iftar times, the fasting tracker and Taraweeh turn on when Ramadan begins. Dates follow your moon sighting setting in Account.'));
  }
  out.push(hero);

  const sel = r.days.find((d) => d.date === rmSel) || r.days.find((d) => d.isToday) || null;
  if (r.active && sel) {
    const c = mk('div', 'card');
    c.appendChild(mk('h3', '', sel.isToday ? `Today, day ${sel.day}` : `Day ${sel.day}`));
    const post = async (body) => {
      try { drawRamadan(await api('/ramadan/day', { method: 'POST', body: JSON.stringify({ date: sel.date, ...body }) })); setTimeout(checkBadges, 800); }
      catch (e) { toast(e.message, true); }
    };
    c.appendChild(mk('p', 'src', 'Did you fast?'));
    const seg = mk('div', 'seg');
    [['yes', 'Yes, I fasted'], ['no', 'No']].forEach(([v, label]) => { const b = mk('button', sel.fasted === v ? 'on' : '', label); b.onclick = () => post({ fasted: v }); seg.appendChild(b); });
    c.appendChild(seg);
    if (sel.fasted === 'no') {
      c.appendChild(mk('p', 'src', 'Reason (the fast will be counted as one to make up):'));
      const chips = mk('div', 'chips');
      r.reasons.forEach((x) => { const b = mk('button', 'chip' + (sel.reason === x ? ' on' : ''), REASON_NAMES[x]); b.onclick = () => post({ fasted: 'no', reason: x }); chips.appendChild(b); });
      c.appendChild(chips);
    }
    c.appendChild(mk('p', 'src', 'Taraweeh prayed:'));
    const tw = mk('div', 'seg');
    [[0, 'Not prayed'], [8, '8 rakats'], [20, '20 rakats']].forEach(([v, label]) => { const b = mk('button', sel.taraweeh === v ? 'on' : '', label); b.onclick = () => post({ taraweeh: v }); tw.appendChild(b); });
    c.appendChild(tw);
    out.push(c);
  }

  out.push(mk('h2', 'sub-h', r.active ? 'Your Ramadan' : `Last Ramadan (${r.label})`));
  const grid = mk('div', 'cal');
  r.days.forEach((d) => {
    let cls = 'cell';
    if (d.future) cls += ' future'; else if (d.fasted === 'yes') cls += ' full'; else if (d.fasted === 'no') cls += ' made';
    if (d.isToday) cls += ' today';
    if (d.taraweeh > 0) cls += ' tj';
    if (r.active && d.date === (sel && sel.date)) cls += ' sel';
    const b = mk('button', cls);
    b.disabled = d.future || !r.active;
    b.append(String(d.day), mk('small', '', d.fasted === 'yes' ? 'fast' : d.fasted === 'no' ? 'missed' : ''));
    b.setAttribute('aria-label', `Day ${d.day}: ${d.fasted === 'yes' ? 'fasted' : d.fasted === 'no' ? 'did not fast' : 'not recorded'}`);
    b.onclick = () => { rmSel = d.date; drawRamadan(r); };
    grid.appendChild(b);
  });
  const legend = mk('p', 'legend');
  legend.append(mk('span', '', 'Dark pink: fasted'), mk('span', '', 'Brown: did not fast'), mk('span', '', 'Gold dot: Taraweeh'));
  out.push(grid, legend);

  const t = r.totals;
  const stats = mk('div', 'stats');
  [['Fasts kept', t.fasted], ['Fasts missed', t.missed], ['Nights of Taraweeh', t.taraweehNights]].forEach(([k, v]) => { const row = mk('div', 'stat'); row.append(mk('span', '', k), mk('b', '', String(v))); stats.appendChild(row); });
  out.push(stats);

  const qc = mk('div', 'card');
  qc.append(mk('h3', '', 'Fasts to make up'), mk('p', 'big small', `${r.owedFasts} left`), mk('p', 'src', `You have made up ${r.qadaMade} missed fast${r.qadaMade === 1 ? '' : 's'}.`));
  const qb = mk('div', 'md-actions');
  const q = async (add) => { try { drawRamadan(await api('/ramadan/qada', { method: 'POST', body: JSON.stringify({ add }) })); setTimeout(checkBadges, 800); } catch (e) { toast(e.message, true); } };
  qb.append(goBtn('I made up one fast', () => q(1), 'fbtn small'), goBtn('Undo', () => q(-1), 'fbtn out small'));
  qc.appendChild(qb);
  out.push(qc);
  $('rmBody').replaceChildren(...out);
}

async function loadRamadan() { drawRamadan(await api('/ramadan')); }

/* ---------- Qaza goal ---------- */
function qazaForm(q, onDone) {
  const c = mk('div', 'card');
  c.appendChild(mk('h3', '', 'How many qaza prayers do you owe?'));
  c.appendChild(mk('p', 'src', 'Count the prayers you missed in the past, for each prayer. A rough number is fine. You can change it later.'));
  const inputs = {};
  q.perPrayer.forEach((p) => {
    const l = mk('label', '', p.name); l.htmlFor = 'qz_' + p.key;
    const i = document.createElement('input'); i.id = 'qz_' + p.key; i.type = 'number'; i.min = '0'; i.inputMode = 'numeric'; i.value = p.owed || '';
    inputs[p.key] = i; c.append(l, i);
  });
  const gl = mk('label', '', 'Your daily goal (prayers per day)'); gl.htmlFor = 'qz_goal';
  const gi = document.createElement('input'); gi.id = 'qz_goal'; gi.type = 'number'; gi.min = '1'; gi.max = '50'; gi.value = q.dailyGoal;
  const save = goBtn('Save my plan', async () => {
    const body = { dailyGoal: Number(gi.value) };
    Object.entries(inputs).forEach(([k, i]) => { body[k] = Number(i.value || 0); });
    try { const r = await api('/qaza/setup', { method: 'PUT', body: JSON.stringify(body) }); qzEditing = false; drawQaza(r); toast('Plan saved'); } catch (e) { toast(e.message, true); }
  }, 'btn');
  c.append(gl, gi, save);
  return c;
}

function drawQaza(q) {
  const out = [];
  if (!q.isSetup || qzEditing) { out.push(qazaForm(q)); $('qzBody').replaceChildren(...out); return; }

  const hero = mk('div', 'dcard hero');
  hero.append(mk('h3', '', 'Qaza prayers left'), mk('p', 'big', String(q.remaining)));
  const m = meter(q.percent); m.classList.add('light-meter');
  hero.append(m, mk('p', '', `${q.madeUp} of ${q.owed} made up (${q.percent}%)`));
  hero.appendChild(mk('p', '', q.remaining ? `At ${q.dailyGoal} a day you will finish in ${q.etaDays} day${q.etaDays === 1 ? '' : 's'}, around ${q.etaLabel}.` : 'Masha Allah, you have made up all of them.'));
  out.push(hero);

  const goal = mk('div', 'card');
  goal.append(mk('h3', '', `Today: ${q.todayMade} of ${q.dailyGoal}`), meter(Math.min(100, (q.todayMade / q.dailyGoal) * 100)), mk('p', q.goalMet ? 'res-ok' : 'src', q.goalMet ? 'Today\'s goal is done. Jazak Allah khair!' : 'Pray a qaza prayer and tap +1 on its row.'));
  out.push(goal);

  out.push(mk('h2', 'sub-h', 'Each prayer'));
  const act = async (path, prayer) => { try { drawQaza(await api('/qaza/' + path, { method: 'POST', body: JSON.stringify({ prayer }) })); setTimeout(checkBadges, 800); } catch (e) { toast(e.message, true); } };
  q.perPrayer.forEach((p) => {
    const row = mk('div', 'prayer');
    const info = mk('div', 'pinfo'); info.append(mk('span', 'name', p.name), mk('span', 'tip', `${p.remaining} left of ${p.owed}`));
    const box = mk('div', 'actions');
    if (p.todayMade) box.appendChild(goBtn('Undo', () => act('undo', p.key), 'act undo'));
    box.appendChild(goBtn('+1 prayed', () => act('pray', p.key), p.remaining ? 'act on' : 'act undo'));
    row.append(mk('span', 'tick', '✓'), info, box);
    out.push(row);
  });

  out.push(mk('h2', 'sub-h', 'Last 14 days'));
  const peak = Math.max(1, q.dailyGoal, ...q.last14.map((d) => d.count));
  const bars = mk('div', 'minibars');
  q.last14.forEach((d) => { const col = mk('div', 'mb' + (d.today ? ' today' : '')); const b = mk('i'); b.style.height = Math.max(5, (d.count / peak) * 100) + '%'; b.title = `${d.label}: ${d.count}`; col.append(b, mk('small', '', d.label.split(' ')[0])); bars.appendChild(col); });
  out.push(bars);

  if (q.appMissed) {
    const c = mk('div', 'card');
    c.append(mk('p', '', `${q.appMissed} missed prayer${q.appMissed === 1 ? '' : 's'} in your prayer calendar are not counted above.`), goBtn('Mark them as qaza in the calendar', () => goView('calendar'), 'fbtn out small'));
    out.push(c);
  }
  out.push(goBtn('Edit my plan', () => { qzEditing = true; drawQaza(q); }, 'link-btn'));
  $('qzBody').replaceChildren(...out);
}

async function loadQaza() { qzEditing = false; drawQaza(await api('/qaza')); }

/* ---------- Achievements ---------- */
async function loadBadges() {
  const b = await api('/badges');
  $('bdSub').textContent = `${b.earnedCount} of ${b.total} badges earned`;
  if (b.newlyEarned.length) toast('New badge: ' + b.newlyEarned.map((x) => x.title).join(', '));
  const all = [...b.earned, ...b.locked];
  const out = [];
  Object.entries(BADGE_GROUPS).forEach(([g, label]) => {
    const items = all.filter((x) => x.group === g).sort((a, c) => a.threshold - c.threshold);
    if (!items.length) return;
    out.push(mk('h2', 'sub-h', label));
    const grid = mk('div', 'bgrid');
    items.forEach((x) => {
      const c = mk('div', 'bcard' + (x.earned ? ' got' : ''));
      c.append(mk('div', 'bicon', x.earned ? '★' : '☆'), mk('b', '', x.title), mk('small', '', x.description));
      if (x.earned) c.appendChild(mk('small', 'src', 'Earned ' + new Date(x.earnedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })));
      else { c.appendChild(meter(x.percent)); c.appendChild(mk('small', 'src', `${x.value} of ${x.threshold}`)); }
      grid.appendChild(c);
    });
    out.push(grid);
  });
  $('bdBody').replaceChildren(...out);
}

function initWorship() { /* the buttons are made when each screen is drawn */ }
