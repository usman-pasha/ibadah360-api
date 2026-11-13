/* PROFILE (what others see) is shown by social.js. This file has the two private screens:
   Edit profile (name, username, bio) and Account (mobile, privacy, namaz settings, password). */
let myUsername = null;
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
// Shows the profile photo in a round avatar, or the initials when there is no photo. Only our own Cloudinary pictures (or a Google profile photo link) are accepted.
const paintAvatar = (el, name, url) => {
  const ok = typeof url === 'string' && /^https:\/\/(res\.cloudinary\.com|[a-z0-9-]+\.googleusercontent\.com)\//i.test(url);
  el.classList.toggle('has-img', ok);
  el.style.backgroundImage = ok ? `url("${url}")` : '';
  el.textContent = ok ? '' : initials(name);
};
const updateAvatar = () => paintAvatar($('avatarBtn'), localStorage.getItem('name'), localStorage.getItem('avatar'));
const getRadio = (n) => { const r = document.querySelector(`input[name="${n}"]:checked`); return r ? r.value : ''; };

// Reads my profile, remembers my username, refreshes the avatar button
async function syncMe() {
  const p = await api('/profile');
  myUsername = p.username;
  localStorage.setItem('name', p.name);
  localStorage.setItem('avatar', p.avatar || '');
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

/* ---------- Profile photo ---------- */
// The photo can be changed on two screens (Account and Edit profile). Both use the same code, their element ids start with ac or ep.
const epPhoto = { enabled: null, max: 5 * 1024 * 1024, sets: ['ac', 'ep'] };

async function ensurePhotoStatus() {
  if (epPhoto.enabled !== null) return;
  try { epPhoto.enabled = (await api('/profile/avatar/status')).enabled; } catch (e) { epPhoto.enabled = false; }
}
// Shows the saved photo (or the initials) everywhere and sets the buttons and notes of both screens
function refreshPhotoUi() {
  const url = localStorage.getItem('avatar') || ''; const name = localStorage.getItem('name');
  epPhoto.sets.forEach((k) => {
    paintAvatar($(k + 'Avatar'), name, url);
    $(k + 'PhotoRemove').classList.toggle('hidden', !url);
    $(k + 'PhotoBtn').disabled = !epPhoto.enabled;
    $(k + 'PhotoNote').textContent = epPhoto.enabled ? 'JPEG, PNG or WebP, up to 5 MB. Your photo is shown on your profile.' : 'Photo upload is not set up on this server yet (the website owner needs to add the Cloudinary keys).';
  });
  updateAvatar();
}

// The photo is made smaller in the browser first (longest side 800 px), then sent as base64. The server checks it again.
function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(1, 800 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); // see-through PNGs get a white background
      g.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That photo could not be opened. Try another one.')); };
    img.src = url;
  });
}

async function pickPhoto(file) {
  if (!file) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast('Please choose a JPEG, PNG or WebP photo', true); return; }
  if (file.size > epPhoto.max) { toast('The photo is too big. The limit is 5 MB', true); return; }
  epPhoto.sets.forEach((k) => { $(k + 'PhotoBtn').disabled = true; $(k + 'PhotoBtn').textContent = 'Uploading…'; });
  try {
    const image = await shrinkPhoto(file); // base64 text, sent to the server, which stores it on Cloudinary
    const r = await api('/profile/avatar', { method: 'PUT', body: JSON.stringify({ image }) });
    localStorage.setItem('avatar', r.avatar);
    toast('Photo saved');
  } catch (e) { toast(e.message, true); }
  epPhoto.sets.forEach((k) => { $(k + 'PhotoBtn').textContent = 'Change photo'; $(k + 'PhotoInput').value = ''; });
  refreshPhotoUi();
}

async function removePhoto() {
  if (!confirm('Remove your profile photo?')) return;
  try {
    await api('/profile/avatar', { method: 'DELETE' });
    localStorage.setItem('avatar', '');
    toast('Photo removed');
  } catch (e) { toast(e.message, true); }
  refreshPhotoUi();
}

/* ---------- Edit profile ---------- */
async function loadEditProfile() {
  const [p, meta] = await Promise.all([syncMe(), getMeta()]);
  localStorage.setItem('avatar', p.avatar || '');
  await ensurePhotoStatus();
  refreshPhotoUi();
  $('epName').value = p.name;
  $('epUsername').value = p.username;
  $('epUsername').maxLength = meta.social.usernameMax;
  $('epBio').value = p.bio;
  $('epBio').maxLength = meta.social.bioMax;
}

/* ---------- Account ---------- */
async function loadAccount() {
  const [a, meta] = await Promise.all([api('/account'), getMeta(), ensurePhotoStatus()]);
  refreshPhotoUi(); // the photo section at the top
  $('acEmail').value = a.email;
  $('acPhone').value = a.phone;
  $('acPrivate').checked = a.isPrivate;
  $('oldPassBox').classList.toggle('hidden', !a.hasPassword);
  $('pwTitle').textContent = a.hasPassword ? 'Change password' : 'Set a password' + (a.google ? ' (you sign in with Google)' : '');
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
  epPhoto.sets.forEach((k) => {
    $(k + 'PhotoBtn').onclick = () => $(k + 'PhotoInput').click();
    $(k + 'PhotoInput').onchange = () => pickPhoto($(k + 'PhotoInput').files[0]);
    $(k + 'PhotoRemove').onclick = removePhoto;
  });
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
