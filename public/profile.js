/* PROFILE (what others see) is shown by social.js. This file has the two private screens:
   Edit profile (name, username, bio) and Account (mobile, privacy, namaz settings, password). */
let myUsername = null;
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const updateAvatar = () => { $('avatarBtn').textContent = initials(localStorage.getItem('name')); };
const getRadio = (n) => { const r = document.querySelector(`input[name="${n}"]:checked`); return r ? r.value : ''; };

// Reads my profile, remembers my username, refreshes the avatar button
async function syncMe() {
  const p = await api('/profile');
  myUsername = p.username;
  localStorage.setItem('name', p.name);
  updateAvatar();
  return p;
}

async function openOwnProfile() {
  try {
    if (!myUsername) await syncMe();
    openUser(myUsername, 'followers', true);
  } catch (e) { toast(e.message, true); }
}

function buildRadios(boxId, name, legend, options, selected) {
  const box = $(boxId);
  box.replaceChildren(mk('legend', '', legend));
  options.forEach((o) => {
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = String(o.value);
    input.checked = String(o.value) === String(selected);
    const text = mk('span', '', o.label);
    if (o.note) { text.append(' '); text.appendChild(mk('small', 'src', `(${o.note})`)); }
    const label = mk('label', 'radio');
    label.append(input, text);
    box.appendChild(label);
  });
}

/* ---------- Edit profile ---------- */
async function loadEditProfile() {
  const [p, meta] = await Promise.all([syncMe(), getMeta()]);
  $('epAvatar').textContent = initials(p.name);
  $('epName').value = p.name;
  $('epUsername').value = p.username;
  $('epUsername').maxLength = meta.social.usernameMax;
  $('epBio').value = p.bio;
  $('epBio').maxLength = meta.social.bioMax;
}

/* ---------- Account ---------- */
async function loadAccount() {
  const [a, meta] = await Promise.all([api('/account'), getMeta()]);
  $('acEmail').value = a.email;
  $('acPhone').value = a.phone;
  $('acPrivate').checked = a.isPrivate;
  $('sCity').value = a.settings.city;
  $('sState').value = a.settings.state;
  buildRadios('madhabBox', 'madhab', 'Asr time (madhab)', meta.settings.madhabs, a.settings.madhab);
  buildRadios('methodBox', 'method', 'Calculation method', meta.settings.methods, a.settings.method);
  buildRadios('hijriBox', 'hijriAdj', 'Moon sighting (Islamic calendar)', meta.settings.hijriAdjustments, a.settings.hijriAdj);
}

function initProfile() {
  updateAvatar();
  syncMe().catch(() => {});
  $('avatarBtn').onclick = openOwnProfile;
  $('epBack').onclick = openOwnProfile;

  $('epSave').onclick = async () => {
    try {
      await api('/profile', { method: 'PUT', body: JSON.stringify({ name: $('epName').value, username: $('epUsername').value, bio: $('epBio').value }) });
      await syncMe();
      toast('Profile saved');
      openOwnProfile();
    } catch (e) { toast(e.message, true); }
  };

  $('acSave').onclick = async () => {
    try {
      await api('/account', { method: 'PUT', body: JSON.stringify({ phone: $('acPhone').value }) });
      toast('Mobile number saved');
      loadAccount();
    } catch (e) { toast(e.message, true); }
  };

  // Public / private account, like Instagram
  $('acPrivate').onchange = async () => {
    const wantPrivate = $('acPrivate').checked;
    const ok = await confirmBox(
      wantPrivate ? 'Make your account private?' : 'Make your account public?',
      wantPrivate
        ? 'Only people you approve can follow you. People who already follow you stay.'
        : 'Anyone can follow you. Follow requests waiting now will be accepted.',
      wantPrivate ? 'Make private' : 'Make public'
    );
    if (!ok) { $('acPrivate').checked = !wantPrivate; return; }
    try {
      const r = await api('/account/privacy', { method: 'PUT', body: JSON.stringify({ isPrivate: wantPrivate }) });
      toast(wantPrivate ? 'Your account is now private' : `Your account is now public${r.accepted ? `. ${r.accepted} request(s) accepted` : ''}`);
      refreshBadge();
    } catch (e) { $('acPrivate').checked = !wantPrivate; toast(e.message, true); }
  };

  $('sSave').onclick = async () => {
    try {
      await api('/account/settings', {
        method: 'PUT',
        body: JSON.stringify({ city: $('sCity').value, state: $('sState').value, madhab: getRadio('madhab'), method: getRadio('method'), hijriAdj: Number(getRadio('hijriAdj')) }),
      });
      toast('Settings saved');
    } catch (e) { toast(e.message, true); }
  };

  $('pPass').onclick = async () => {
    if ($('pNew').value !== $('pNew2').value) return toast('The new passwords do not match', true);
    try {
      await api('/account/password', { method: 'POST', body: JSON.stringify({ current: $('pOld').value, next: $('pNew').value }) });
      ['pOld', 'pNew', 'pNew2'].forEach((id) => ($(id).value = ''));
      toast('Password changed');
    } catch (e) { toast(e.message, true); }
  };
}
