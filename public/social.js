/* Find people, other people's profiles and follow requests.
   The server decides every rule (public or private, requests, who can see the lists). */
let peoplePage = 1;
let viewUser = null;
let backView = 'people';
let connTab = 'followers';
let connPage = 1;
let reqPage = 1;
let searchTimer;
let userRoot = false; // true when the profile was opened from the menu (my own profile)

const avatarEl = (name, cls) => mk('div', 'avatar ' + (cls || ''), initials(name));

function setBadge(n) {
  const b = $('reqBadge');
  b.textContent = n;
  b.hidden = !n;
}
async function refreshBadge() {
  try { setBadge((await api('/follow/summary')).requests); } catch (e) { /* ignore */ }
}

function openUser(username, tab, root) {
  userRoot = !!root;
  if (!userRoot && view !== 'user') backView = view;
  viewUser = username;
  connTab = tab || 'followers';
  connPage = 1;
  view = 'user';
  closeDrawer();
  window.scrollTo(0, 0);
  loadView();
}

/* ---------- follow buttons (Follow, Requested, Following) ---------- */
async function toggleFollow(u, after) {
  const r = u.relationship;
  try {
    if (r.following || r.requested) {
      const title = r.following ? `Unfollow @${u.username}?` : 'Cancel follow request?';
      const text = r.following
        ? `If you unfollow, you will need to follow again${u.isPrivate ? ' and wait for approval' : ''}.`
        : `Your request to follow @${u.username} will be withdrawn.`;
      if (!(await confirmBox(title, text, r.following ? 'Unfollow' : 'Cancel request'))) return;
      await api(`/users/${encodeURIComponent(u.username)}/follow`, { method: 'DELETE' });
    } else {
      const res = await api(`/users/${encodeURIComponent(u.username)}/follow`, { method: 'POST' });
      toast(res.relationship.requested ? 'Follow request sent' : `You are following @${u.username}`);
    }
  } catch (e) { toast(e.message, true); }
  after();
  refreshBadge();
}

function followButton(u, after, header) {
  const r = u.relationship;
  if (r.self) {
    if (!header) return mk('span', 'src', 'You');
    const b = mk('button', 'fbtn out', 'Edit profile');
    b.onclick = () => { view = 'editprofile'; window.scrollTo(0, 0); loadView(); };
    return b;
  }
  const label = r.following ? 'Following' : r.requested ? 'Requested' : r.followsYou ? 'Follow back' : 'Follow';
  const b = mk('button', 'fbtn' + (r.following || r.requested ? ' out' : '') + (header ? '' : ' small'), label);
  b.onclick = (e) => { e.stopPropagation(); toggleFollow(u, after); };
  return b;
}

function personRow(u, after, extra) {
  const info = mk('div', 'pinfo2');
  info.append(mk('div', 'pname', u.name), mk('div', 'src', '@' + u.username + (u.isPrivate ? ' · Private' : '')));
  if (u.bio) info.appendChild(mk('div', 'pbio', u.bio));
  info.onclick = () => openUser(u.username);
  const actions = mk('div', 'person-actions');
  if (extra) actions.appendChild(extra);
  actions.appendChild(followButton(u, after));
  const row = mk('div', 'person');
  row.append(avatarEl(u.name, 'avatar-sm'), info, actions);
  return row;
}

/* ---------- Find people ---------- */
async function loadPeople() {
  const meta = await getMeta();
  const term = $('peopleSearch').value.trim();
  const list = $('peopleList');
  if (term.replace(/^@/, '').length < meta.social.searchMin) {
    list.replaceChildren();
    $('peoplePager').replaceChildren();
    $('peopleHint').textContent = `Type at least ${meta.social.searchMin} letters of a name or username.`;
    return;
  }
  const r = await api(`/users/search?q=${encodeURIComponent(term)}&page=${peoplePage}&limit=10`);
  peoplePage = r.page;
  $('peopleHint').textContent = r.total ? `${r.total} found` : 'No one found. Check the spelling.';
  list.replaceChildren(...r.users.map((u) => personRow(u, loadPeople)));
  renderPager($('peoplePager'), r.page, r.pages, (p) => { peoplePage = p; loadPeople(); });
}

/* ---------- Someone's profile ---------- */
function setCount(btn, n, label) {
  btn.replaceChildren(mk('b', '', String(n)), mk('span', '', label));
}

async function loadConnections(p) {
  const r = await api(`/users/${encodeURIComponent(p.username)}/${connTab}?page=${connPage}&limit=10`);
  $('uConnTitle').textContent = connTab === 'followers' ? 'Followers' : 'Following';
  const list = $('uConnList');
  list.replaceChildren();
  if (!r.users.length) list.appendChild(mk('p', 'empty', connTab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'));
  r.users.forEach((u) => {
    let extra = null;
    if (p.relationship.self && connTab === 'followers') {
      extra = mk('button', 'fbtn out small', 'Remove');
      extra.onclick = async (e) => {
        e.stopPropagation();
        if (!(await confirmBox(`Remove @${u.username}?`, 'They will stop following you. They are not told.', 'Remove'))) return;
        try { await api(`/follow/followers/${encodeURIComponent(u.username)}`, { method: 'DELETE' }); } catch (err) { toast(err.message, true); }
        loadUser();
      };
    }
    list.appendChild(personRow(u, loadUser, extra));
  });
  renderPager($('uConnPager'), r.page, r.pages, (pg) => { connPage = pg; loadUser(); });
}

async function loadUser() {
  if (!viewUser) { view = 'people'; return loadView(); }
  let p;
  try { p = await api(`/users/${encodeURIComponent(viewUser)}`); }
  catch (e) {
    toast(e.message, true);
    viewUser = null;
    view = backView === 'user' ? 'people' : backView;
    return loadView();
  }
  $('uBack').hidden = userRoot;
  $('uAvatar').textContent = initials(p.name);
  $('uName').textContent = p.name;
  $('uHandle').textContent = '@' + p.username + (p.isPrivate ? ' · Private account' : '');
  $('uBio').textContent = p.bio;
  $('uSince').textContent = 'Member since ' + p.joined;
  setCount($('uFollowers'), p.counts.followers, 'Followers');
  setCount($('uFollowing'), p.counts.following, 'Following');
  $('uFollowers').disabled = $('uFollowing').disabled = !p.canViewConnections;
  $('uFollowers').classList.toggle('on', p.canViewConnections && connTab === 'followers');
  $('uFollowing').classList.toggle('on', p.canViewConnections && connTab === 'following');
  $('uAction').replaceChildren(followButton(p, loadUser, true));
  $('uPrivate').classList.toggle('hidden', p.canViewConnections);
  $('uConn').classList.toggle('hidden', !p.canViewConnections);
  if (p.canViewConnections) await loadConnections(p);
}

/* ---------- Follow requests (for private accounts) ---------- */
async function loadRequests() {
  const r = await api(`/follow/requests?page=${reqPage}&limit=10`);
  reqPage = r.page;
  setBadge(r.total);
  $('reqHint').textContent = r.total
    ? `${r.total} waiting for your approval`
    : 'No follow requests. When your account is private, people who want to follow you appear here.';
  $('reqList').replaceChildren(...r.users.map((u) => {
    const done = async (path, opts, msg) => {
      try { await api(path, opts); toast(msg); } catch (e) { toast(e.message, true); }
      loadRequests();
    };
    const yes = mk('button', 'fbtn small', 'Confirm');
    yes.onclick = () => done(`/follow/requests/${encodeURIComponent(u.username)}/accept`, { method: 'POST' }, `@${u.username} can now follow you`);
    const no = mk('button', 'fbtn out small', 'Delete');
    no.onclick = () => done(`/follow/requests/${encodeURIComponent(u.username)}`, { method: 'DELETE' }, 'Request deleted');
    const info = mk('div', 'pinfo2');
    info.append(mk('div', 'pname', u.name), mk('div', 'src', '@' + u.username));
    info.onclick = () => openUser(u.username);
    const actions = mk('div', 'person-actions');
    actions.append(yes, no);
    const row = mk('div', 'person');
    row.append(avatarEl(u.name, 'avatar-sm'), info, actions);
    return row;
  }));
  renderPager($('reqPager'), r.page, r.pages, (p) => { reqPage = p; loadRequests(); });
}

function initSocial() {
  $('peopleSearch').oninput = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { peoplePage = 1; loadPeople().catch((e) => toast(e.message, true)); }, 300);
  };
  $('uBack').onclick = () => { viewUser = null; view = backView === 'user' ? 'people' : backView; window.scrollTo(0, 0); loadView(); };
  $('uFollowers').onclick = () => { connTab = 'followers'; connPage = 1; loadUser(); };
  $('uFollowing').onclick = () => { connTab = 'following'; connPage = 1; loadUser(); };
}
