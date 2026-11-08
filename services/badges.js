// Badges and milestones, like "30 days all on time". Worked out from the person's real numbers.
const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const QazaPlan = require('../models/QazaPlan');
const TasbihDay = require('../models/TasbihDay');
const RamadanDay = require('../models/RamadanDay');
const prayers = require('./prayers');
const readlog = require('./readlog');
const learn = require('./learn');

const sum = (o) => Object.values(o || {}).reduce((n, v) => n + (typeof v === 'number' ? v : 0), 0);

// pre = numbers the caller already has (stats, rs, lp), so nothing is worked out twice
async function metrics(req, user, pre) {
  const stats = pre.stats || (await prayers.compute(req, user)).stats;
  const rs = pre.rs || (await readlog.readStats(user._id));
  const lp = pre.lp || (await learn.summary(user._id));
  const [plan, tasbih, ram] = await Promise.all([
    QazaPlan.findOne({ user: user._id }).lean(), TasbihDay.find({ user: user._id }).lean(), RamadanDay.find({ user: user._id }).lean(),
  ]);
  return {
    bestStreak: stats.best, ontimeTotal: stats.ontime, qazaMade: stats.qaza + sum(plan && plan.madeUp), tahajjudNights: stats.tahajjud,
    ayahsRead: rs.totalRead, parasDone: rs.parasDone, lessonsDone: lp.done,
    tasbihTotal: tasbih.reduce((n, r) => n + r.count, 0),
    fastsDone: ram.filter((r) => r.fasted === 'yes').length, taraweehNights: ram.filter((r) => r.taraweeh > 0).length,
  };
}

async function evaluate(req, user, pre = {}) {
  const [defs, have] = await Promise.all([Badge.find().sort({ order: 1 }).lean(), UserBadge.find({ user: user._id }).lean()]);
  const m = await metrics(req, user, pre);
  const owned = Object.fromEntries(have.map((h) => [h.key, h]));
  const fresh = new Set();
  for (const d of defs) {
    if (owned[d.key] || (m[d.metric] || 0) < d.threshold) continue;
    try { await UserBadge.create({ user: user._id, key: d.key }); } catch (e) { if (e.code !== 11000) throw e; }
    owned[d.key] = { key: d.key, earnedAt: new Date() };
    fresh.add(d.key);
  }
  const items = defs.map((d) => {
    const value = m[d.metric] || 0;
    const got = owned[d.key];
    return { key: d.key, group: d.group, title: d.title, description: d.description, earned: !!got, earnedAt: got ? got.earnedAt : null, value: Math.min(value, d.threshold), threshold: d.threshold, percent: Math.min(100, Math.round((value / d.threshold) * 100)), isNew: fresh.has(d.key) };
  });
  const earned = items.filter((i) => i.earned).sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));
  const locked = items.filter((i) => !i.earned).sort((a, b) => b.percent - a.percent);
  return { total: defs.length, earnedCount: earned.length, earned, locked, newlyEarned: items.filter((i) => i.isNew) };
}

module.exports = { evaluate };
