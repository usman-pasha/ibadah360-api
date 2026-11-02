/* My profile: full name, mobile, namaz time settings, password. Uses helpers from tracker.js. */
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const updateAvatar = () => { $('avatarBtn').textContent = initials(localStorage.getItem('name')); };
const getRadio = (n) => { const r = document.querySelector(`input[name="${n}"]:checked`); return r ? r.value : ''; };
const setRadio = (n, v) => document.querySelectorAll(`input[name="${n}"]`).forEach((r) => { r.checked = r.value === String(v); });

async function papi(path, opts = {}) {
  const res = await fetch('/api/profile' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
  });
  if (res.status === 401) { localStorage.clear(); location.href = 'index.html'; throw new Error('Logged out'); }
  let d;
  try { d = await res.json(); } catch { throw new Error('The server did not answer correctly. Restart it with npm start'); }
  if (!res.ok) throw new Error(d.message || 'Something went wrong');
  return d;
}

function fillSettings(s) {
  $('sCity').value = s.city;
  $('sState').value = s.state;
  setRadio('madhab', s.madhab);
  setRadio('method', s.method);
  setRadio('hijriAdj', s.hijriAdj);
}

async function loadProfile() {
  const p = await papi('');
  $('pName').textContent = p.name;
  $('avatarLg').textContent = initials(p.name);
  $('pSince').textContent = 'Member since ' + new Date(p.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  $('pNameIn').value = p.name;
  $('pEmail').value = p.email;
  $('pPhone').value = p.phone;
  setPrefs(p.settings);
  fillSettings(prefs);
}

// Pull saved settings from the server in the background so every device agrees.
async function syncPrefs() {
  try {
    const p = await papi('');
    const before = JSON.stringify(prefs);
    setPrefs(p.settings);
    localStorage.setItem('name', p.name);
    updateAvatar();
    fillSettings(prefs);
    if (JSON.stringify(prefs) !== before) { hv = null; if (['today', 'times', 'hijri'].includes(view)) loadView(); }
  } catch { /* offline or logged out: keep local copy */ }
}

function initProfile() {
  updateAvatar();
  fillSettings(prefs);
  syncPrefs();
  $('avatarBtn').onclick = () => { view = 'profile'; closeDrawer(); window.scrollTo(0, 0); loadView(); };

  $('pSave').onclick = async () => {
    try {
      const p = await papi('', { method: 'PUT', body: JSON.stringify({ name: $('pNameIn').value, phone: $('pPhone').value }) });
      localStorage.setItem('name', p.name);
      updateAvatar();
      toast('Details saved');
      loadProfile();
    } catch (e) { toast(e.message, true); }
  };

  $('sSave').onclick = async () => {
    try {
      const p = await papi('/settings', {
        method: 'PUT',
        body: JSON.stringify({ city: $('sCity').value, state: $('sState').value, madhab: getRadio('madhab'), method: getRadio('method'), hijriAdj: Number(getRadio('hijriAdj')) }),
      });
      setPrefs(p.settings);
      hv = null;
      timesWarned = false;
      toast('Settings saved');
    } catch (e) { toast(e.message, true); }
  };

  $('pPass').onclick = async () => {
    if ($('pNew').value !== $('pNew2').value) return toast('The new passwords do not match', true);
    try {
      await papi('/password', { method: 'POST', body: JSON.stringify({ current: $('pOld').value, next: $('pNew').value }) });
      ['pOld', 'pNew', 'pNew2'].forEach((id) => ($(id).value = ''));
      toast('Password changed');
    } catch (e) { toast(e.message, true); }
  };
}
