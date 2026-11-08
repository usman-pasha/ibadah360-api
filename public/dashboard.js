/* Dashboard: the home screen. One request, the server works everything out. */
const dcard = (title, cls, ...kids) => { const c = mk('div', 'dcard ' + (cls || '')); if (title) c.appendChild(mk('h3', '', title)); c.append(...kids); return c; };
const meter = (percent) => { const m = mk('div', 'meter'); const i = mk('div'); i.style.width = Math.min(100, percent) + '%'; m.appendChild(i); return m; };
const goBtn = (label, fn, cls) => { const b = mk('button', cls || 'fbtn small', label); b.onclick = fn; return b; };
const goView = (v) => { view = v; window.scrollTo(0, 0); loadView(); };

async function loadDashboard() {
  const d = await api('/dashboard');
  $('dbHello').textContent = `Welcome back, ${d.name.split(' ')[0]}`;
  $('dbDate').textContent = d.date + (d.hijri.text ? ' · ' + d.hijri.text : '') + (d.hijri.events.length ? ' · ' + d.hijri.events.join(', ') : '') + (d.hijri.eid ? ' · Eid Mubarak!' : '');
  const cards = [];

  // next prayer
  const n = d.prayers.next;
  cards.push(dcard('Next prayer', 'hero',
    n ? mk('p', 'big', n.name) : mk('p', 'big', 'Set your city'),
    mk('p', '', n ? `${n.label} · in ${n.inLabel}` : 'Add your city in Account to see prayer times.'),
    goBtn(n ? 'All prayer times' : 'Open Account', () => goView(n ? 'times' : 'account'), 'fbtn small light')));

  // Ramadan (only when it is Ramadan, or close)
  const rm = d.ramadan;
  if (rm && (rm.active || (rm.nextRamadan && rm.nextRamadan.daysUntil <= 45))) {
    if (rm.active) {
      cards.push(dcard(rm.label, 'hero wide', mk('p', 'big', `Day ${rm.dayNumber} of ${rm.dayCount}`),
        rm.times ? mk('p', '', `Sehri ends ${rm.times.sehri.label} · Iftar ${rm.times.iftar.label} · ${rm.times.next.name} in ${rm.times.next.inLabel}`) : mk('p', '', 'Open Ramadan for your fasting tracker.'),
        mk('p', 'src light-text', rm.fastedToday === 'yes' ? 'You are fasting today.' : rm.fastedToday === 'no' ? 'Not fasting today.' : 'Not recorded yet.'),
        goBtn('Fasting and Taraweeh', () => goView('ramadan'), 'fbtn small light')));
    } else cards.push(dcard('Ramadan', 'wide', mk('p', 'big small', `Starts in ${rm.nextRamadan.daysUntil} days`), mk('p', 'src', rm.nextRamadan.label), goBtn('Ramadan mode', () => goView('ramadan'))));
  }

  // today
  const ring = mk('div', 'ring'); ring.style.setProperty('--p', (d.prayers.done / d.prayers.total) * 100);
  ring.appendChild(mk('span', '', `${d.prayers.done}/${d.prayers.total}`));
  const side = mk('div');
  side.append(mk('p', '', `Streak: ${d.prayers.streak} day${d.prayers.streak === 1 ? '' : 's'}`), mk('p', 'src', d.prayers.missed ? `${d.prayers.missed} missed prayers to make up` : 'Nothing missed'), goBtn('Mark prayers', () => goView('today')));
  const row = mk('div', 'row'); row.append(ring, side);
  cards.push(dcard('Prayers today', '', row));

  // week
  const bars = mk('div', 'minibars');
  d.week.forEach((w) => {
    const col = mk('div', 'mb' + (w.today ? ' today' : ''));
    const bar = mk('i'); bar.style.height = Math.max(5, (w.count / 5) * 100) + '%'; bar.title = `${w.label}: ${w.count} of 5`;
    col.append(bar, mk('small', '', w.label));
    bars.appendChild(col);
  });
  cards.push(dcard('This week', 'wide', bars));

  // qaza goal and badges
  const qz = d.qaza;
  const qkids = qz.isSetup
    ? [mk('p', 'big small', `${qz.remaining} left`), meter(qz.percent), mk('p', 'src', `Today ${qz.todayMade} of ${qz.dailyGoal} · about ${qz.etaDays} days to finish`), goBtn('Qaza goal', () => goView('qaza'))]
    : [mk('p', '', 'Set a goal to make up your missed prayers.'), goBtn('Set my goal', () => goView('qaza'))];
  cards.push(dcard('Qaza goal', '', ...qkids));
  const bg = d.badges;
  cards.push(dcard('Achievements', '', mk('p', 'big small', `${bg.earned} of ${bg.total}`), mk('p', 'src', bg.recent ? 'Latest: ' + bg.recent : 'Pray on time to earn your first badge'), ...(bg.next ? [mk('p', 'src', `Next: ${bg.next.title} (${bg.next.percent}%)`), meter(bg.next.percent)] : []), goBtn('See achievements', () => goView('badges'))));
  if (d.newBadges.length) toast('New badge: ' + d.newBadges.join(', '));

  // Quran
  const q = d.quran;
  cards.push(dcard('Quran', '',
    mk('p', '', q.started ? q.label : 'Start reading. Your place is saved automatically.'),
    meter(q.percent),
    mk('p', 'src', `${q.ayahsRead} of ${q.ayahs} ayahs read (${q.percent}%) · ${q.parasDone} paras finished`),
    goBtn(q.started ? 'Continue reading' : 'Start reading', () => goView('quran'))));

  // learning
  const l = d.learning;
  const lc = [mk('p', '', l.next ? `Next: ${l.next.title}` : 'You finished every lesson. Masha Allah!'), meter(l.percent), mk('p', 'src', `${l.done} of ${l.total} lessons done (${l.percent}%)`)];
  lc.push(goBtn(l.next ? 'Continue learning' : 'See the course', () => (l.next ? openLesson(l.next.key) : goView('course'))));
  cards.push(dcard('Learn Quran', '', ...lc));

  // people
  const s = d.social;
  const pc = [mk('p', '', `${s.followers} followers · ${s.following} following`)];
  pc.push(s.requests ? goBtn(`${s.requests} follow request${s.requests > 1 ? 's' : ''}`, () => openPeople('requests')) : goBtn('Find people', () => openPeople('find')));
  cards.push(dcard('People', '', ...pc));

  // coming up
  if (d.upcoming) cards.push(dcard('Coming up', '', mk('p', 'big small' + (d.upcoming.eid ? ' eid-tag' : ''), d.upcoming.name), mk('p', 'src', `${d.upcoming.hijriText} · ${d.upcoming.dateLabel}`), mk('p', '', d.upcoming.inLabel), goBtn('Islamic calendar', () => goView('hijri'))));

  $('dbGrid').replaceChildren(...cards);
}
