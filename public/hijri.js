/* Islamic calendar screen. The server works out all dates, events and notes. */
let hOffset = 0;
let hSel = null;

async function loadHijri() {
  const m = await api('/hijri/month?offset=' + hOffset);
  $('hLabel').textContent = m.label;
  $('hSub').textContent = m.gregorianLabel;
  $('hPrev').onclick = () => { hOffset = m.prevOffset; hSel = null; loadHijri(); };
  $('hNext').onclick = () => { hOffset = m.nextOffset; hSel = null; loadHijri(); };

  if (!hSel || !m.days.some((d) => d.date === hSel)) hSel = (m.days.find((d) => d.isToday) || {}).date || null;

  const grid = $('hGrid');
  grid.replaceChildren();
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((w) => grid.appendChild(mk('div', 'wd', w)));
  for (let i = 0; i < m.leadBlanks; i++) grid.appendChild(mk('div'));
  m.days.forEach((d) => {
    let cls = 'cell hcell';
    if (d.eid) cls += ' eid'; else if (d.events.length) cls += ' ev';
    if (d.whiteDay) cls += ' white';
    if (d.friday) cls += ' fri';
    if (d.isToday) cls += ' today';
    if (d.date === hSel) cls += ' sel';
    const b = mk('button', cls);
    b.append(mk('span', '', String(d.hijri.d)), mk('small', '', String(d.gDay)));
    b.setAttribute('aria-label', `${d.hijri.text}, ${d.label}${d.events.length ? ', ' + d.events.map((e) => e.name).join(', ') : ''}`);
    b.onclick = () => { hSel = d.date; loadHijri(); };
    grid.appendChild(b);
  });

  const body = $('hDayBody');
  body.replaceChildren();
  const sel = m.days.find((d) => d.date === hSel);
  if (!sel) $('hDayTitle').textContent = 'Select a day';
  else {
    $('hDayTitle').textContent = sel.label;
    body.appendChild(mk('p', 'src', sel.hijri.text));
    if (!sel.notes.length) body.appendChild(mk('p', 'hint', 'No special day.'));
    sel.notes.forEach((n) => { const c = mk('div', 'card'); c.append(mk('h3', '', n.title), mk('p', '', n.text)); body.appendChild(c); });
  }

  const up = await api('/hijri/upcoming?limit=8');
  $('hUpcoming').replaceChildren(...up.map((e) => {
    const row = mk('div', 'stat');
    const left = mk('span');
    left.append(mk('b', e.eid ? 'eid-tag' : '', e.name), mk('br'), mk('small', 'src', `${e.hijriText} · ${e.dateLabel}`));
    row.append(left, mk('span', 'src', e.inLabel));
    return row;
  }));
}

function initHijri() {
  $('hToday').onclick = () => { hOffset = 0; hSel = null; loadHijri(); };
  $('hGoProfile').onclick = () => { view = 'account'; window.scrollTo(0, 0); loadView(); };
}
