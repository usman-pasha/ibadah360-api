/* Tools: tasbih counter, zakat calculator, nearby masjids. The server does all the work. */
const rupee = (n) => Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

/* ---------- Tasbih ---------- */
let tasbih = null;
let tasbihPending = 0;
let tasbihTimer;

function drawTasbih() {
  const c = tasbih.current;
  const d = tasbih.dhikrs.find((x) => x.key === c.key) || {};
  $('tsAr').textContent = d.ar || '';
  $('tsTr').textContent = d.tr ? `${d.tr} · ${d.en}` : '';
  $('tsCount').textContent = c.count;
  $('tsTarget').textContent = `of ${c.target}`;
  $('tsRounds').textContent = `Rounds finished: ${c.rounds}`;
  $('tsDhikr').replaceChildren(...tasbih.dhikrs.map((x) => {
    const b = mk('button', 'chip' + (x.key === c.key ? ' on' : ''), x.tr);
    b.onclick = async () => { await flushTasbih(); try { tasbih = await api('/tasbih/select', { method: 'PUT', body: JSON.stringify({ key: x.key }) }); drawTasbih(); } catch (e) { toast(e.message, true); } };
    return b;
  }));
  const row = (k, v) => { const r = mk('div', 'stat'); r.append(mk('span', '', k), mk('b', '', String(v))); return r; };
  $('tsToday').replaceChildren(row('Said today', tasbih.today.total), ...tasbih.today.byDhikr.map((x) => row(x.name, x.count)), row('All time', tasbih.lifetime));
  const max = Math.max(1, ...tasbih.week.map((w) => w.count));
  const bars = mk('div', 'minibars');
  tasbih.week.forEach((w) => {
    const col = mk('div', 'mb' + (w.today ? ' today' : ''));
    const bar = mk('i'); bar.style.height = Math.max(5, (w.count / max) * 100) + '%'; bar.title = `${w.label}: ${w.count}`;
    col.append(bar, mk('small', '', w.label));
    bars.appendChild(col);
  });
  $('tsWeek').replaceChildren(bars);
}

async function loadTasbih() {
  tasbih = await api('/tasbih');
  drawTasbih();
}

// Taps show at once. They are sent to the server a moment later, in one batch.
function tasbihTap() {
  if (!tasbih) return;
  const c = tasbih.current;
  c.count++; tasbih.today.total++; tasbih.lifetime++;
  const finished = c.count >= c.target;
  if (finished) { c.count = 0; c.rounds++; }
  if (navigator.vibrate) navigator.vibrate(finished ? [60, 40, 60] : 12);
  tasbihPending++;
  drawTasbih();
  clearTimeout(tasbihTimer);
  if (tasbihPending >= 50) flushTasbih(); else tasbihTimer = setTimeout(flushTasbih, 800);
}
async function flushTasbih() {
  clearTimeout(tasbihTimer);
  if (!tasbihPending) return;
  const n = tasbihPending;
  tasbihPending = 0;
  try { tasbih = await api('/tasbih/count', { method: 'POST', body: JSON.stringify({ add: n }), keepalive: true }); if (view === 'tasbih') drawTasbih(); }
  catch (e) { tasbihPending += n; toast(e.message, true); }
}

/* ---------- Zakat calculator ---------- */
const Z_FIELDS = [
  ['goldGrams', 'Gold you own (grams)'], ['silverGrams', 'Silver you own (grams)'],
  ['goldPrice', 'Gold price today (₹ per gram)'], ['silverPrice', 'Silver price today (₹ per gram)'],
  ['cash', 'Cash in hand (₹)'], ['bank', 'Money in the bank (₹)'], ['investments', 'Shares and investments (₹)'],
  ['business', 'Business stock for sale (₹)'], ['receivables', 'Money others owe you (₹)'], ['other', 'Other savings (₹)'],
  ['debts', 'Debts you have to pay now (₹)'],
];

async function loadZakat() {
  const z = await api('/zakat');
  $('zNote').textContent = `Nisab is 87.48 g of gold or 612.36 g of silver. Zakat is ${z.constants.rate * 100}% of your savings kept for a year, if they reach the nisab.`;
  if (!$('zForm').children.length) {
    $('zForm').replaceChildren(...Z_FIELDS.flatMap(([k, label]) => {
      const l = mk('label', '', label); l.htmlFor = 'z_' + k;
      const i = document.createElement('input');
      i.id = 'z_' + k; i.type = 'number'; i.min = '0'; i.step = 'any'; i.inputMode = 'decimal';
      if (z.last && z.last[k]) i.value = z.last[k];
      return [l, i];
    }));
    const basis = (z.last && z.last.nisabBasis) || 'silver';
    document.querySelectorAll('input[name="nisab"]').forEach((r) => { r.checked = r.value === basis; });
  }
  $('zHistory').replaceChildren(...z.history.map((h) => { const r = mk('div', 'stat'); r.append(mk('span', '', new Date(h.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })), mk('b', '', h.eligible ? rupee(h.zakat) : 'Below nisab')); return r; }));
}

async function calcZakat() {
  const body = { nisabBasis: getRadio('nisab') };
  Z_FIELDS.forEach(([k]) => { body[k] = $('z_' + k).value; });
  try {
    const r = await api('/zakat/calculate', { method: 'POST', body: JSON.stringify(body) });
    const row = (k, v, cls) => { const x = mk('div', 'stat'); x.append(mk('span', '', k), mk('b', cls || '', v)); return x; };
    const box = mk('div', 'card');
    box.appendChild(mk('h2', 'date-h', r.eligible ? `Zakat due: ${rupee(r.zakat)}` : 'No zakat is due'));
    box.appendChild(mk('p', r.eligible ? 'res-ok' : 'src', r.eligible ? `Your savings (${rupee(r.net)}) are above the nisab (${rupee(r.nisab.value)}).` : `Your savings (${rupee(r.net)}) are below the nisab (${rupee(r.nisab.value)}).`));
    const list = mk('div', 'stats');
    r.breakdown.filter((b) => b.value).forEach((b) => list.appendChild(row(b.label, rupee(b.value))));
    list.append(row('Total savings', rupee(r.assets)), row('Debts to pay now', '− ' + rupee(r.debts)), row('Zakatable amount', rupee(r.net)), row(`Nisab (${r.nisab.grams} g of ${r.nisab.basis})`, rupee(r.nisab.value)));
    box.append(list, mk('p', 'src', 'This is a guide. For your own case, please ask a qualified scholar.'));
    $('zResult').replaceChildren(box);
    $('zResult').scrollIntoView({ behavior: 'smooth' });
    loadZakat();
  } catch (e) { toast(e.message, true); }
}

/* ---------- Nearby masjids ---------- */
let mdRadius = 3000;
let mdPos = null;
let mdMap = null;
let mdLayer = null;
const mdMarkers = {};
const dist = (m) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);

async function loadMasjids() {
  document.querySelectorAll('.md-r').forEach((b) => b.classList.toggle('on', Number(b.dataset.r) === mdRadius));
  $('mdHint').textContent = 'Searching…';
  let r;
  try { r = await api(`/places/masjids?${mdPos ? `lat=${mdPos.lat}&lng=${mdPos.lng}&` : ''}radius=${mdRadius}`); }
  catch (e) { $('mdHint').textContent = e.message; $('mdList').replaceChildren(); return; }
  $('mdHint').textContent = (r.center.source === 'you' ? 'Around your location' : 'Around the centre of your saved city') + `. ${r.places.length} found within ${dist(r.radius)}. Map data: ${r.source}.`;

  if (window.L) {
    if (!mdMap) {
      mdMap = L.map('mdMap');
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(mdMap);
      mdLayer = L.layerGroup().addTo(mdMap);
    }
    mdLayer.clearLayers();
    const pts = [[r.center.lat, r.center.lng]];
    L.circleMarker(pts[0], { radius: 9, color: '#2b6cb0', fillColor: '#4299e1', fillOpacity: 0.9 }).bindPopup(r.center.source === 'you' ? 'You are here' : 'City centre').addTo(mdLayer);
    r.places.forEach((p) => {
      pts.push([p.lat, p.lng]);
      mdMarkers[p.id] = L.circleMarker([p.lat, p.lng], { radius: 8, color: '#8f2554', fillColor: '#c4467d', fillOpacity: 0.9 }).bindPopup(`<b>${p.name.replace(/[<>&]/g, '')}</b><br>${dist(p.distance)}`).addTo(mdLayer);
    });
    mdMap.invalidateSize();
    mdMap.fitBounds(pts, { padding: [24, 24], maxZoom: 16 });
  } else $('mdMap').textContent = 'The map could not load. The list below still works.';

  $('mdList').replaceChildren(...r.places.map((p) => {
    const c = mk('div', 'card md-card');
    c.append(mk('h3', '', p.name), mk('p', 'src', dist(p.distance) + (p.address ? ' · ' + p.address : '')));
    const act = mk('div', 'md-actions');
    const dir = mk('a', 'fbtn small', 'Directions'); dir.href = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`; dir.target = '_blank'; dir.rel = 'noopener';
    act.appendChild(dir);
    if (p.phone) { const t = mk('a', 'fbtn out small', 'Call'); t.href = 'tel:' + p.phone.replace(/[^\d+]/g, ''); act.appendChild(t); }
    if (mdMap) { const s = mk('button', 'fbtn out small', 'Show on map'); s.onclick = () => { mdMap.setView([p.lat, p.lng], 17); mdMarkers[p.id] && mdMarkers[p.id].openPopup(); $('mdMap').scrollIntoView({ behavior: 'smooth', block: 'center' }); }; act.appendChild(s); }
    c.appendChild(act);
    return c;
  }));
}

function initTools() {
  $('tsTap').onclick = tasbihTap;
  $('tsReset').onclick = async () => {
    if (!(await confirmBox('Reset the counter?', 'The count and rounds start again from zero. Your totals are kept.', 'Reset'))) return;
    await flushTasbih();
    try { tasbih = await api('/tasbih/reset', { method: 'POST' }); drawTasbih(); } catch (e) { toast(e.message, true); }
  };
  $('tsTargetSave').onclick = async () => {
    await flushTasbih();
    try { tasbih = await api('/tasbih/select', { method: 'PUT', body: JSON.stringify({ key: tasbih.current.key, target: Number($('tsTargetIn').value) }) }); drawTasbih(); toast('Target changed'); }
    catch (e) { toast(e.message, true); }
  };
  window.addEventListener('pagehide', flushTasbih);
  $('zCalc').onclick = calcZakat;
  document.querySelectorAll('.md-r').forEach((b) => { b.onclick = () => { mdRadius = Number(b.dataset.r); loadMasjids(); }; });
  $('mdCity').onclick = () => { mdPos = null; loadMasjids(); };
  $('mdLocate').onclick = () => {
    if (!navigator.geolocation) return toast('This browser cannot find your location', true);
    $('mdHint').textContent = 'Finding your location…';
    navigator.geolocation.getCurrentPosition(
      (p) => { mdPos = { lat: p.coords.latitude, lng: p.coords.longitude }; loadMasjids(); },
      () => { $('mdHint').textContent = ''; toast('Could not get your location. Allow location access, or use your saved city.', true); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
}
