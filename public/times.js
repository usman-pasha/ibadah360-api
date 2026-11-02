/* Prayer times page. City, madhab and method are set in My profile. */
const T_FARD = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const T_NAME = { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };

async function loadTimesView() {
  await loadTimes();
  const box = $('timesBody');
  box.replaceChildren();
  $('timesSub').textContent = `${[prefs.city, prefs.state, 'India'].filter(Boolean).join(', ')} · ${nice(today())}`;
  $('timesNote').textContent = `Asr: ${prefs.madhab === 'hanafi' ? 'Hanafi' : 'Shafi, Maliki, Hanbali'} · Method: ${prefs.method === '3' ? 'Muslim World League' : 'University of Islamic Sciences, Karachi'}`;

  if (!times) {
    box.appendChild(mk('p', 'empty', 'Could not load prayer times. Check your internet and the city in My profile.'));
    return;
  }

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let next = T_FARD.find((k) => toMin(times[k]) > nowMin);
  let mins;
  let nextName;
  if (next) { mins = toMin(times[next]) - nowMin; nextName = T_NAME[next]; }
  else { next = 'fajr'; mins = 1440 - nowMin + toMin(times.fajr); nextName = 'Fajr (tomorrow)'; }
  const card = mk('div', 'next-card');
  card.append(
    mk('p', '', 'Next prayer'),
    mk('p', 'big', nextName),
    mk('p', '', `${show12(times[next])} · in ${mins >= 60 ? Math.floor(mins / 60) + ' h ' : ''}${mins % 60} min`)
  );
  box.appendChild(card);

  const current = [...T_FARD].reverse().find((k) => toMin(times[k]) <= nowMin);
  const list = mk('div', 'stats');
  ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach((k) => {
    if (!times[k]) return;
    const r = mk('div', 'stat' + (k === current ? ' now' : ''));
    r.append(mk('span', '', T_NAME[k]), mk('b', '', show12(times[k])));
    list.appendChild(r);
  });
  box.appendChild(list);

  box.appendChild(mk('h2', 'sub-h', 'Voluntary prayer times'));
  const extra = mk('div', 'stats');
  const erow = (name, time) => { const r = mk('div', 'stat'); r.append(mk('span', '', name), mk('b', '', time)); extra.appendChild(r); };
  if (times.sunrise) {
    const m = toMin(times.sunrise) + 15;
    erow('Ishraq and Duha begin (about)', show12(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`));
  }
  if (times.midnight) erow('Islamic midnight', show12(times.midnight));
  if (times.lastthird) erow('Tahajjud: last third of the night begins', show12(times.lastthird));
  box.appendChild(extra);
}

function initTimes() {
  $('tGoProfile').onclick = () => { view = 'profile'; window.scrollTo(0, 0); loadView(); };
}
