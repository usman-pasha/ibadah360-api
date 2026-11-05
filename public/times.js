/* Prayer times screen. The server downloads, saves and works out everything shown here. */
async function loadTimesView() {
  const t = await api('/times');
  const box = $('timesBody');
  box.replaceChildren();
  const loc = t.location;
  $('timesSub').textContent = [loc.city, loc.state, loc.country].filter(Boolean).join(', ');
  $('timesNote').textContent = `Asr: ${t.madhab.label} · Method: ${t.method.label}`;
  $('timesSource').textContent = `Times come from ${t.source} and are saved by Ibadah360. Please confirm with your local masjid.`;
  if (!t.available) { box.appendChild(mk('p', 'empty', t.message)); return; }

  const card = mk('div', 'next-card');
  card.append(mk('p', '', 'Next prayer'), mk('p', 'big', t.next.name), mk('p', '', `${t.next.label} · in ${t.next.inLabel}`));
  box.appendChild(card);

  const list = mk('div', 'stats');
  t.timings.forEach((r) => {
    const row = mk('div', 'stat' + (r.key === t.current ? ' now' : ''));
    row.append(mk('span', '', r.name), mk('b', '', r.label));
    list.appendChild(row);
  });
  box.appendChild(list);

  if (t.voluntary.length) {
    box.appendChild(mk('h2', 'sub-h', 'Voluntary prayer times'));
    const extra = mk('div', 'stats');
    t.voluntary.forEach((r) => { const row = mk('div', 'stat'); row.append(mk('span', '', r.name), mk('b', '', r.label)); extra.appendChild(row); });
    box.appendChild(extra);
  }
}

function initTimes() {
  $('tGoProfile').onclick = () => { view = 'account'; window.scrollTo(0, 0); loadView(); };
}
