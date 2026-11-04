/* My profile. Options (madhab, method, moon sighting) come from GET /api/meta. */
let myUsername = null;
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const updateAvatar = () => { $('avatarBtn').textContent = initials(localStorage.getItem('name')); };
const getRadio = (n) => { const r = document.querySelector(`input[name="${n}"]:checked`); return r ? r.value : ''; };

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

async function loadProfile() {
  const [p, meta] = await Promise.all([api('/profile'), getMeta()]);
  myUsername = p.username;
  localStorage.setItem('name', p.name);
  updateAvatar();
  $('pName').textContent = p.name;
  $('pHandle').textContent = '@' + p.username + (p.isPrivate ? ' · Private account' : ' · Public account');
  $('avatarLg').textContent = initials(p.name);
  $('pSince').textContent = 'Member since ' + new Date(p.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  $('pNameIn').value = p.name;
  $('pUsername').value = p.username;
  $('pUsername').maxLength = meta.social.usernameMax;
  $('pBio').value = p.bio;
  $('pBio').maxLength = meta.social.bioMax;
  $('pEmail').value = p.email;
  $('pPhone').value = p.phone;
  $('pPrivate').checked = p.isPrivate;
  setCount($('pFollowers'), p.social.followers, 'Followers');
  setCount($('pFollowing'), p.social.following, 'Following');
  setBadge(p.social.requests);
  $('sCity').value = p.settings.city;
  $('sState').value = p.settings.state;
  buildRadios('madhabBox', 'madhab', 'Asr time (madhab)', meta.settings.madhabs, p.settings.madhab);
  buildRadios('methodBox', 'method', 'Calculation method', meta.settings.methods, p.settings.method);
  buildRadios('hijriBox', 'hijriAdj', 'Moon sighting (Islamic calendar)', meta.settings.hijriAdjustments, p.settings.hijriAdj);
}

function initProfile() {
  updateAvatar();
  $('avatarBtn').onclick = () => { view = 'profile'; closeDrawer(); window.scrollTo(0, 0); loadView(); };

  $('pSave').onclick = async () => {
    try {
      const p = await api('/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: $('pNameIn').value, phone: $('pPhone').value, username: $('pUsername').value, bio: $('pBio').value }),
      });
      localStorage.setItem('name', p.name);
      toast('Details saved');
      loadProfile();
    } catch (e) { toast(e.message, true); }
  };

  // Public / private account, like Instagram
  $('pPrivate').onchange = async () => {
    const wantPrivate = $('pPrivate').checked;
    const ok = await confirmBox(
      wantPrivate ? 'Make your account private?' : 'Make your account public?',
      wantPrivate
        ? 'Only people you approve can follow you. People who already follow you stay.'
        : 'Anyone can follow you. Follow requests waiting now will be accepted.',
      wantPrivate ? 'Make private' : 'Make public'
    );
    if (!ok) { $('pPrivate').checked = !wantPrivate; return; }
    try {
      const r = await api('/profile/privacy', { method: 'PUT', body: JSON.stringify({ isPrivate: wantPrivate }) });
      toast(wantPrivate ? 'Your account is now private' : `Your account is now public${r.accepted ? `. ${r.accepted} request(s) accepted` : ''}`);
      loadProfile();
    } catch (e) { $('pPrivate').checked = !wantPrivate; toast(e.message, true); }
  };
  $('pFollowers').onclick = () => myUsername && openUser(myUsername, 'followers');
  $('pFollowing').onclick = () => myUsername && openUser(myUsername, 'following');
  $('pViewPublic').onclick = () => myUsername && openUser(myUsername);

  $('sSave').onclick = async () => {
    try {
      await api('/profile/settings', {
        method: 'PUT',
        body: JSON.stringify({ city: $('sCity').value, state: $('sState').value, madhab: getRadio('madhab'), method: getRadio('method'), hijriAdj: Number(getRadio('hijriAdj')) }),
      });
      toast('Settings saved');
    } catch (e) { toast(e.message, true); }
  };

  $('pPass').onclick = async () => {
    if ($('pNew').value !== $('pNew2').value) return toast('The new passwords do not match', true);
    try {
      await api('/profile/password', { method: 'POST', body: JSON.stringify({ current: $('pOld').value, next: $('pNew').value }) });
      ['pOld', 'pNew', 'pNew2'].forEach((id) => ($(id).value = ''));
      toast('Password changed');
    } catch (e) { toast(e.message, true); }
  };
}
