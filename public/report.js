/* Progress report: prayers, Quran reading and learning for a chosen period. */
let rpRange = 'week';

function barChart(series, twoLayer) {
  const wrap = mk('div');
  const bars = mk('div', 'bars');
  const labels = mk('div', 'blabels');
  const every = series.bars.length > 14 ? Math.ceil(series.bars.length / 7) : 1;
  series.bars.forEach((b, i) => {
    const col = mk('div', 'bcol');
    col.title = `${b.label}: ${b.value}${twoLayer ? ` marked, ${b.ontime} on time` : ''}`;
    const all = mk('div', 'all'); all.style.height = Math.max(b.value ? 3 : 0, (b.value / b.max) * 100) + '%';
    col.appendChild(all);
    if (twoLayer) { const on = mk('div', 'on'); on.style.height = (b.ontime / b.max) * 100 + '%'; col.appendChild(on); }
    bars.appendChild(col);
    labels.appendChild(mk('span', '', i % every === 0 ? b.label : ''));
  });
  wrap.append(bars, labels);
  return wrap;
}

const num = (value, label) => { const d = mk('div', 'snum'); d.append(mk('b', '', String(value)), mk('span', '', label)); return d; };

async function loadReport() {
  document.querySelectorAll('.rp-tab').forEach((b) => b.classList.toggle('on', b.dataset.range === rpRange));
  const r = await api('/report?range=' + rpRange);
  $('rpSub').textContent = `${r.label} · ${r.days} day${r.days === 1 ? '' : 's'}`;
  const box = $('rpBody');
  const p = r.prayers;
  const sections = [];

  // prayers
  const grid = mk('div', 'sgrid');
  grid.append(num(p.onTimePercent + '%', 'On time'), num(p.completedPercent + '%', 'Prayed (incl. qaza)'), num(`${p.streak} / ${p.bestStreak}`, 'Streak / best'), num(p.missed, 'Missed'));
  const chart = barChart(p.series, true);
  const legend = mk('p', 'src', 'Dark: on time. Light: prayed (on time or qaza). Out of 5 each day.');
  const per = mk('div', 'stats');
  p.perPrayer.forEach((x) => {
    const total = x.ontime + x.qaza + x.missed || 1;
    const stack = mk('div', 'stack');
    [['a', x.ontime], ['b', x.qaza], ['c', x.missed]].forEach(([c, n]) => { const i = mk('i', c); i.style.width = (n / total) * 100 + '%'; stack.appendChild(i); });
    const row = mk('div', 'stat col');
    const top = mk('div', 'between'); top.append(mk('span', '', x.name), mk('span', 'src', `${x.ontime} on time · ${x.qaza} qaza · ${x.missed} missed`));
    row.append(top, stack);
    per.appendChild(row);
  });
  const nafl = mk('div', 'sgrid');
  p.nafl.forEach((x) => nafl.appendChild(num(x.count, x.name)));
  sections.push(
    mk('h2', 'sub-h', 'Prayers'),
    (() => { const c = mk('div', 'card'); c.append(grid, mk('h3', 'rp-h', 'Each day'), chart, legend); return c; })(),
    mk('h2', 'sub-h', 'By prayer'), per,
    mk('h2', 'sub-h', 'Voluntary prayers'), (() => { const c = mk('div', 'card'); c.appendChild(nafl); return c; })()
  );

  // Quran
  const q = r.quran;
  const qg = mk('div', 'sgrid');
  qg.append(num(q.ayahsInPeriod, 'Ayahs read'), num(q.readingDays, 'Reading days'), num(q.total.parasDone, 'Paras finished'), num(q.total.surahsDone, 'Surahs finished'));
  const qc = mk('div', 'card');
  qc.append(qg, mk('h3', 'rp-h', `Whole Quran: ${q.total.ayahsRead} of ${q.total.ayahs} ayahs (${q.total.percent}%)`), meter(q.total.percent), mk('h3', 'rp-h', 'Ayahs read each day'), barChart(q.series, false));
  if (q.label) qc.appendChild(mk('p', 'src', 'You stopped at: ' + q.label));
  sections.push(mk('h2', 'sub-h', 'Quran reading'), qc);

  // learning
  const l = r.learning;
  const lc = mk('div', 'card');
  lc.append(mk('p', '', `${l.done} of ${l.total} lessons done (${l.percent}%)`), meter(l.percent));
  l.levels.forEach((lv) => { const row = mk('div', 'between'); row.append(mk('span', '', `Level ${lv.level} · ${lv.title}`), mk('b', '', lv.percent + '%')); lc.append(row, meter(lv.percent)); });
  if (l.next) lc.appendChild(mk('p', 'src', 'Next lesson: ' + l.next.title));
  sections.push(mk('h2', 'sub-h', 'Learning'), lc);

  sections.push(mk('p', 'src', `Followers ${r.social.followers} · Following ${r.social.following}`));
  box.replaceChildren(...sections);
}

function initReport() {
  document.querySelectorAll('.rp-tab').forEach((b) => { b.onclick = () => { rpRange = b.dataset.range; loadReport().catch((e) => toast(e.message, true)); }; });
  $('rpPrint').onclick = () => window.print();
}
