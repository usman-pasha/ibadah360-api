// Group Khatam: friends split the 30 juz of the Quran and tick them off together.
const mongoose = require('mongoose');
const KhatamGroup = require('../models/KhatamGroup');
const User = require('../models/User');
const { makeCode, cleanCode } = require('../utils/codes');

const MAX_MEMBERS = 30; const MAX_GROUPS = 20; const MAX_JUZ_EACH = 10;
const fail = (msg, status) => Object.assign(new Error(msg), { status: status || 400, expose: true });
const same = (a, b) => String(a) === String(b);
const validJuz = (n) => Number.isInteger(n) && n >= 1 && n <= 30;

async function load(id, userId) {
  if (!mongoose.isValidObjectId(id)) throw fail('Group not found', 404);
  const g = await KhatamGroup.findById(id);
  if (!g || !g.members.some((m) => same(m, userId))) throw fail('Group not found', 404); // a non-member cannot even tell that it exists
  return g;
}

async function view(g, userId) {
  const people = await User.find({ _id: { $in: g.members } }).select('name username avatar').lean();
  const info = Object.fromEntries(people.map((u) => [String(u._id), { name: u.name, username: u.username || null, avatar: u.avatar || '' }]));
  const done = g.juz.filter((j) => j.done).length;
  return {
    id: String(g._id), name: g.name, code: g.code, round: g.round, completedRounds: g.completedRounds,
    isOwner: same(g.owner, userId), done, total: 30, percent: Math.round((done / 30) * 100), complete: done === 30,
    members: g.members.map((m) => ({ ...(info[String(m)] || { name: 'Member' }), me: same(m, userId), owner: same(m, g.owner), juzCount: g.juz.filter((j) => j.user && same(j.user, m)).length, doneCount: g.juz.filter((j) => j.user && same(j.user, m) && j.done).length })),
    juz: g.juz.slice().sort((a, b) => a.n - b.n).map((j) => ({ n: j.n, done: !!j.done, taken: !!j.user, mine: !!j.user && same(j.user, userId), by: j.user ? (info[String(j.user)] || { name: 'Member' }).name : null })),
  };
}

async function list(userId) {
  const groups = await KhatamGroup.find({ members: userId }).sort({ updatedAt: -1 }).lean();
  return groups.map((g) => { const done = g.juz.filter((j) => j.done).length; return { id: String(g._id), name: g.name, members: g.members.length, done, percent: Math.round((done / 30) * 100), round: g.round }; });
}

async function create(userId, rawName) {
  const name = String(rawName || '').trim();
  if (name.length < 2 || name.length > 40) throw fail('Give the group a name of 2 to 40 letters');
  if ((await KhatamGroup.countDocuments({ members: userId })) >= MAX_GROUPS) throw fail(`You can be in up to ${MAX_GROUPS} groups`);
  for (let i = 0; i < 5; i++) {
    try {
      const g = await KhatamGroup.create({ name, code: makeCode(), owner: userId, members: [userId], juz: Array.from({ length: 30 }, (_, k) => ({ n: k + 1, user: null, done: false })) });
      return view(g, userId);
    } catch (e) { if (e.code !== 11000) throw e; }
  }
  throw fail('Could not make an invite code. Please try again', 500);
}

async function join(userId, rawCode) {
  const code = cleanCode(rawCode);
  const g = await KhatamGroup.findOne({ code });
  if (!g) throw fail('No group has that code. Check it and try again', 404);
  if (g.members.some((m) => same(m, userId))) return view(g, userId);
  if ((await KhatamGroup.countDocuments({ members: userId })) >= MAX_GROUPS) throw fail(`You can be in up to ${MAX_GROUPS} groups`);
  // the size check is part of the update, so two people joining at once cannot go past the limit
  const r = await KhatamGroup.updateOne({ _id: g._id, [`members.${MAX_MEMBERS - 1}`]: { $exists: false } }, { $addToSet: { members: userId } });
  if (!r.modifiedCount) throw fail(`This group is full (${MAX_MEMBERS} members)`);
  return view(await KhatamGroup.findById(g._id), userId);
}

async function claim(userId, id, n) {
  const g = await load(id, userId);
  if (!validJuz(n)) throw fail('Juz must be 1 to 30');
  if (g.juz.filter((j) => j.user && same(j.user, userId) && !j.done).length >= MAX_JUZ_EACH) throw fail(`Finish some of your juz first. You can hold ${MAX_JUZ_EACH} at a time`);
  // taken only if nobody has it yet: two people tapping at once cannot both get it
  const r = await KhatamGroup.updateOne({ _id: g._id, juz: { $elemMatch: { n, user: null } } }, { $set: { 'juz.$.user': userId } });
  if (!r.modifiedCount) throw fail(`Juz ${n} was just taken by someone else`, 409);
  return view(await KhatamGroup.findById(g._id), userId);
}

async function release(userId, id, n) {
  const g = await load(id, userId);
  if (!validJuz(n)) throw fail('Juz must be 1 to 30');
  const r = await KhatamGroup.updateOne({ _id: g._id, juz: { $elemMatch: { n, user: userId, done: false } } }, { $set: { 'juz.$.user': null } });
  if (!r.modifiedCount) throw fail('You can only give back your own juz that is not finished');
  return view(await KhatamGroup.findById(g._id), userId);
}

async function setDone(userId, id, n, done) {
  const g = await load(id, userId);
  if (!validJuz(n)) throw fail('Juz must be 1 to 30');
  const r = await KhatamGroup.updateOne({ _id: g._id, juz: { $elemMatch: { n, user: userId } } }, { $set: { 'juz.$.done': !!done, 'juz.$.doneAt': done ? new Date() : null } });
  if (!r.matchedCount) throw fail('You can only tick your own juz');
  const fresh = await KhatamGroup.findById(g._id);
  return view(fresh, userId);
}

async function restart(userId, id) {
  const g = await load(id, userId);
  if (!same(g.owner, userId)) throw fail('Only the group owner can start a new khatam', 403);
  if (g.juz.some((j) => !j.done)) throw fail('Every juz must be finished first');
  g.juz.forEach((j) => { j.user = null; j.done = false; j.doneAt = undefined; });
  g.completedRounds += 1; g.round += 1;
  await g.save();
  return view(g, userId);
}

async function leave(userId, id) {
  const g = await load(id, userId);
  g.members = g.members.filter((m) => !same(m, userId));
  if (!g.members.length) { await g.deleteOne(); return { left: true, deleted: true }; }
  g.juz.forEach((j) => { if (j.user && same(j.user, userId) && !j.done) j.user = null; }); // unfinished juz go back to the group
  if (same(g.owner, userId)) g.owner = g.members[0];
  await g.save();
  return { left: true, deleted: false };
}

module.exports = { list, view, load, create, join, claim, release, setDone, restart, leave };
