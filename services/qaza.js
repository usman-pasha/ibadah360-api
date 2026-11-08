// Qaza goal: prayers owed from the past, how many were made up, and a daily goal to finish them.
const Plan = require('../models/QazaPlan');
const Log = require('../models/QazaLog');
const prayers = require('./prayers');
const { getDefs } = require('./content');
const { userNow, addDays, at, longDate } = require('../utils/dates');

const PR = prayers.PRAYERS;
const zero = () => Object.fromEntries(PR.map((p) => [p, 0]));
const bad = (message) => Object.assign(new Error(message), { status: 400, expose: true });
const total = (o) => PR.reduce((n, p) => n + (Number(o[p]) || 0), 0);

async function summary(req, user, pre = {}) {
  const today = userNow(req).date;
  const [plan, logs, defs] = await Promise.all([
    Plan.findOne({ user: user._id }).lean(),
    Log.find({ user: user._id, date: { $gte: addDays(today, -13), $lte: today } }).lean(),
    getDefs(),
  ]);
  const owed = { ...zero(), ...((plan && plan.owed) || {}) };
  const made = { ...zero(), ...((plan && plan.madeUp) || {}) };
  const owedTotal = total(owed); const madeTotal = total(made);
  const remaining = Math.max(0, owedTotal - madeTotal);
  const goal = plan ? plan.dailyGoal : 5;
  const todayLogs = logs.filter((l) => l.date === today);
  const todayMade = todayLogs.reduce((n, l) => n + l.count, 0);
  const etaDays = remaining && goal ? Math.ceil(remaining / goal) : 0;
  const missed = pre.missed !== undefined ? pre.missed : (await prayers.compute(req, user)).stats.missed;
  const nameOf = Object.fromEntries(defs.fard.map((d) => [d.key, d.name]));
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(today, -i);
    last14.push({ date: d, label: at(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }), count: logs.filter((l) => l.date === d).reduce((n, l) => n + l.count, 0), today: i === 0 });
  }
  return {
    isSetup: owedTotal > 0, owed: owedTotal, madeUp: madeTotal, remaining, percent: owedTotal ? Math.round((madeTotal / owedTotal) * 100) : 0,
    dailyGoal: goal, todayMade, goalMet: todayMade >= goal, etaDays, etaDate: etaDays ? addDays(today, etaDays) : null, etaLabel: etaDays ? longDate(addDays(today, etaDays)) : null,
    appMissed: missed,
    perPrayer: PR.map((p) => ({ key: p, name: nameOf[p] || p, owed: owed[p], madeUp: made[p], remaining: Math.max(0, owed[p] - made[p]), todayMade: (todayLogs.find((l) => l.prayer === p) || { count: 0 }).count })),
    last14,
  };
}

async function setup(userId, body) {
  const owed = {}; const made = {};
  const plan = await Plan.findOne({ user: userId }).lean();
  for (const p of PR) {
    const n = Number(body[p]);
    if (!Number.isInteger(n) || n < 0 || n > 100000) throw bad(`Enter a whole number from 0 to 100000 for ${p}`);
    owed[p] = n;
    made[p] = Math.min(n, (plan && plan.madeUp && plan.madeUp[p]) || 0); // the made up count can never be more than owed
  }
  const goal = Number(body.dailyGoal === undefined ? (plan ? plan.dailyGoal : 5) : body.dailyGoal);
  if (!Number.isInteger(goal) || goal < 1 || goal > 50) throw bad('Daily goal must be 1 to 50');
  await Plan.findOneAndUpdate({ user: userId }, { $set: { owed, madeUp: made, dailyGoal: goal } }, { upsert: true, setDefaultsOnInsert: true });
}

async function pray(req, user, prayer, count) {
  if (!PR.includes(prayer)) throw bad('Unknown prayer');
  const n = Number(count === undefined ? 1 : count);
  if (!Number.isInteger(n) || n < 1 || n > 20) throw bad('Count must be 1 to 20');
  const plan = await Plan.findOne({ user: user._id }).lean();
  if (!plan) throw bad('Set up your qaza first');
  const left = (plan.owed[prayer] || 0) - (plan.madeUp[prayer] || 0);
  if (left <= 0) throw bad('No qaza left for this prayer');
  const add = Math.min(n, left);
  await Plan.findOneAndUpdate({ user: user._id }, { $inc: { [`madeUp.${prayer}`]: add } });
  await Log.updateOne({ user: user._id, date: userNow(req).date, prayer }, { $inc: { count: add } }, { upsert: true });
}

async function undo(req, user, prayer) {
  if (!PR.includes(prayer)) throw bad('Unknown prayer');
  const date = userNow(req).date;
  const log = await Log.findOne({ user: user._id, date, prayer }).lean();
  if (!log || log.count < 1) throw bad('Nothing to undo for today');
  await Plan.findOneAndUpdate({ user: user._id }, { $inc: { [`madeUp.${prayer}`]: -1 } });
  await Log.updateOne({ user: user._id, date, prayer }, { $inc: { count: -1 } });
}

module.exports = { summary, setup, pray, undo };
