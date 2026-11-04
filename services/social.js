// Instagram style follow rules. Public accounts: follow is instant. Private accounts: follow becomes a
// request that the owner accepts or deletes. Everyone can see a profile card; a private account's
// followers and following lists are only visible to the owner and to accepted followers.
const User = require('../models/User');
const Follow = require('../models/Follow');
const { USERNAME_MIN, USERNAME_MAX, RESERVED } = require('../config/social');

const sid = (x) => String(x);
const publicUser = (u) => ({ username: u.username, name: u.name, bio: u.bio || '', isPrivate: !!u.isPrivate });
const joinedLabel = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const findByUsername = (name) => User.findOne({ username: String(name || '').trim().toLowerCase() });

async function counts(userId) {
  const [followers, following, requests] = await Promise.all([
    Follow.countDocuments({ following: userId, status: 'accepted' }),
    Follow.countDocuments({ follower: userId, status: 'accepted' }),
    Follow.countDocuments({ following: userId, status: 'pending' }),
  ]);
  return { followers, following, requests };
}

// How the viewer is connected to each user: { self, following, requested, followsYou }
async function relations(viewerId, users) {
  const out = {};
  users.forEach((u) => { out[sid(u._id)] = { self: sid(u._id) === sid(viewerId), following: false, requested: false, followsYou: false }; });
  const ids = users.map((u) => u._id);
  if (!ids.length) return out;
  const rows = await Follow.find({ $or: [{ follower: viewerId, following: { $in: ids } }, { following: viewerId, follower: { $in: ids } }] }).lean();
  rows.forEach((r) => {
    if (sid(r.follower) === sid(viewerId)) {
      const o = out[sid(r.following)];
      if (o) { if (r.status === 'accepted') o.following = true; else o.requested = true; }
    } else {
      const o = out[sid(r.follower)];
      if (o && r.status === 'accepted') o.followsYou = true;
    }
  });
  return out;
}
const canView = (target, rel) => !target.isPrivate || rel.self || rel.following;

async function followState(viewerId, target) {
  const rel = (await relations(viewerId, [target]))[sid(target._id)];
  const c = await counts(target._id);
  return { relationship: rel, counts: { followers: c.followers, following: c.following } };
}

// A page of followers / following. Users are loaded in a second query so this works the same everywhere.
async function listPeople(match, otherSide, viewerId, page, limit, extra) {
  const total = await Follow.countDocuments(match);
  const pages = Math.max(1, Math.ceil(total / limit));
  const p = Math.min(pages, Math.max(1, page));
  const rows = await Follow.find(match).sort({ createdAt: -1 }).skip((p - 1) * limit).limit(limit).lean();
  const users = await User.find({ _id: { $in: rows.map((r) => r[otherSide]) } }).select('username name bio isPrivate').lean();
  const byId = Object.fromEntries(users.map((u) => [sid(u._id), u]));
  const ordered = rows.map((r) => ({ row: r, u: byId[sid(r[otherSide])] })).filter((x) => x.u);
  const rels = await relations(viewerId, ordered.map((x) => x.u));
  return {
    total, page: p, pages, limit,
    users: ordered.map((x) => ({ ...publicUser(x.u), relationship: rels[sid(x.u._id)], ...(extra ? { requestedAt: x.row.createdAt } : {}) })),
  };
}
const followersOf = (target, viewerId, page, limit) => listPeople({ following: target._id, status: 'accepted' }, 'follower', viewerId, page, limit);
const followingOf = (target, viewerId, page, limit) => listPeople({ follower: target._id, status: 'accepted' }, 'following', viewerId, page, limit);
const requestsFor = (userId, page, limit) => listPeople({ following: userId, status: 'pending' }, 'follower', userId, page, limit, true);

/* ---------- usernames ---------- */
function usernameError(u) {
  if (u.length < USERNAME_MIN || u.length > USERNAME_MAX) return `Username must be ${USERNAME_MIN} to ${USERNAME_MAX} characters`;
  if (!/^[a-z0-9._]+$/.test(u)) return 'Username can only have letters, numbers, dots and underscores';
  if (/^\.|\.$|\.\./.test(u)) return 'Username cannot start or end with a dot, or have two dots in a row';
  if (RESERVED.includes(u)) return 'This username is not available';
  return null;
}

// Makes a free username from a seed such as the start of an email address.
async function uniqueUsername(seed) {
  let base = String(seed || '').toLowerCase().replace(/[^a-z0-9._]/g, '').replace(/\.{2,}/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 20);
  if (base.length < 3) base = ('user' + base).slice(0, 20);
  for (let i = 0; i < 12; i++) {
    const cand = i === 0 ? base : base + String(Math.floor(Math.random() * (i > 6 ? 900000 : 9000)) + (i > 6 ? 100000 : 1000));
    if (!RESERVED.includes(cand) && !(await User.exists({ username: cand }))) return cand;
  }
  return 'user' + Date.now();
}

module.exports = { publicUser, joinedLabel, findByUsername, counts, relations, canView, followState, followersOf, followingOf, requestsFor, usernameError, uniqueUsername };
