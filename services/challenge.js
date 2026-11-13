// Friends and family challenges. The scores are worked out from what members already record: prayers, Quran reading, tasbih.
const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const Prayer = require('../models/Prayer');
const ReadingDay = require('../models/ReadingDay');
const TasbihDay = require('../models/TasbihDay');
const { makeCode, cleanCode } = require('../utils/codes');
const { addDays } = require('../utils/dates');

const MAX_MEMBERS = 30; const MAX_CHALLENGES = 20;
const METRICS = {
  prayers: { label: 'Prayers on time', unit: 'prayers' },
  quran: { label: 'Quran ayahs read', unit: 'ayahs' },
  tasbih: { label: 'Tasbih count', unit: 'dhikr' },
};
const fail = (msg, status) => Object.assign(new Error(msg), { status: status || 400, expose: true });
const same = (a, b) => String(a) === String(b);
const FARD = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

async function scores(c, today) {
  const to = c.endDate < today ? c.endDate : today;
  const out = Object.fromEntries(c.members.map((m) => [String(m), 0]));
  if (to < c.startDate) return out; // not started yet
  const range = { $gte: c.startDate, $lte: to };
  if (c.metric === 'prayers') {
    const rows = await Prayer.find({ user: { $in: c.members }, date: range }).select('user ' + FARD.join(' ')).lean();
    rows.forEach((r) => { out[String(r.user)] += FARD.filter((p) => r[p] === 'ontime').length; });
  } else if (c.metric === 'quran') {
    const rows = await ReadingDay.aggregate([{ $match: { user: { $in: c.members }, date: range } }, { $group: { _id: '$user', n: { $sum: '$ayahs' } } }]);
    rows.forEach((r) => { out[String(r._id)] = r.n; });
  } else {
    const rows = await TasbihDay.aggregate([{ $match: { user: { $in: c.members }, date: range } }, { $group: { _id: '$user', n: { $sum: '$count' } } }]);
    rows.forEach((r) => { out[String(r._id)] = r.n; });
  }
  return out;
}

async function view(c, userId, today) {
  const [sc, people] = await Promise.all([scores(c, today), User.find({ _id: { $in: c.members } }).select('name username avatar').lean()]);
  const info = Object.fromEntries(people.map((u) => [String(u._id), u]));
  const rows = c.members.map((m) => ({ name: (info[String(m)] || {}).name || 'Member', username: (info[String(m)] || {}).username || null, avatar: (info[String(m)] || {}).avatar || '', score: sc[String(m)] || 0, me: same(m, userId), owner: same(m, c.owner) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  let rank = 0; let prev = null;
  rows.forEach((r, i) => { if (r.score !== prev) { rank = i + 1; prev = r.score; } r.rank = rank; });
  const status = today < c.startDate ? 'upcoming' : today > c.endDate ? 'ended' : 'active';
  const daysLeft = status === 'active' ? Math.round((new Date(c.endDate) - new Date(today)) / 864e5) + 1 : 0;
  return { id: String(c._id), name: c.name, code: c.code, metric: c.metric, metricLabel: METRICS[c.metric].label, unit: METRICS[c.metric].unit, startDate: c.startDate, endDate: c.endDate, status, daysLeft, isOwner: same(c.owner, userId), members: c.members.length, rows };
}

async function load(id, userId) {
  if (!mongoose.isValidObjectId(id)) throw fail('Challenge not found', 404);
  const c = await Challenge.findById(id);
  if (!c || !c.members.some((m) => same(m, userId))) throw fail('Challenge not found', 404);
  return c;
}

async function list(userId, today) {
  const cs = await Challenge.find({ members: userId }).sort({ endDate: -1 }).lean();
  return cs.map((c) => ({ id: String(c._id), name: c.name, metricLabel: METRICS[c.metric].label, members: c.members.length, startDate: c.startDate, endDate: c.endDate, status: today < c.startDate ? 'upcoming' : today > c.endDate ? 'ended' : 'active' }));
}

async function create(userId, today, { name, metric, days }) {
  const n = String(name || '').trim();
  if (n.length < 2 || n.length > 40) throw fail('Give the challenge a name of 2 to 40 letters');
  if (!METRICS[metric]) throw fail('Choose what to count: prayers, Quran or tasbih');
  const d = Number(days);
  if (!Number.isInteger(d) || d < 1 || d > 30) throw fail('A challenge can last 1 to 30 days');
  if ((await Challenge.countDocuments({ members: userId })) >= MAX_CHALLENGES) throw fail(`You can be in up to ${MAX_CHALLENGES} challenges`);
  for (let i = 0; i < 5; i++) {
    try {
      const c = await Challenge.create({ name: n, metric, code: makeCode(), owner: userId, members: [userId], startDate: today, endDate: addDays(today, d - 1) });
      return view(c, userId, today);
    } catch (e) { if (e.code !== 11000) throw e; }
  }
  throw fail('Could not make an invite code. Please try again', 500);
}

async function join(userId, today, rawCode) {
  const c = await Challenge.findOne({ code: cleanCode(rawCode) });
  if (!c) throw fail('No challenge has that code. Check it and try again', 404);
  if (c.members.some((m) => same(m, userId))) return view(c, userId, today);
  if (today > c.endDate) throw fail('This challenge has already ended');
  if ((await Challenge.countDocuments({ members: userId })) >= MAX_CHALLENGES) throw fail(`You can be in up to ${MAX_CHALLENGES} challenges`);
  const r = await Challenge.updateOne({ _id: c._id, [`members.${MAX_MEMBERS - 1}`]: { $exists: false } }, { $addToSet: { members: userId } });
  if (!r.modifiedCount) throw fail(`This challenge is full (${MAX_MEMBERS} members)`);
  return view(await Challenge.findById(c._id), userId, today);
}

async function leave(userId, id) {
  const c = await load(id, userId);
  c.members = c.members.filter((m) => !same(m, userId));
  if (!c.members.length) { await c.deleteOne(); return { left: true, deleted: true }; }
  if (same(c.owner, userId)) c.owner = c.members[0];
  await c.save();
  return { left: true, deleted: false };
}

module.exports = { list, view, load, create, join, leave, METRICS };
