// What a person has read in the Quran: where they stopped, every ayah they read, and how much of the Quran is done.
const ReadAyah = require('../models/ReadAyah');
const ReadingDay = require('../models/ReadingDay');
const Progress = require('../models/ReadingProgress');
const para = require('./para');
const { COMPLETE_AT } = require('../config/learn');
const { DEFAULT_RECITER } = require('../config/audio');

const DEFAULTS = { mode: 'para', surah: 1, ayah: 1, script: 'uthmani', lang: 'en', size: 1.7, reciter: DEFAULT_RECITER, autoNext: true };

async function progressView(userId) {
  const row = await Progress.findOne({ user: userId }).lean();
  const p = { ...DEFAULTS };
  if (row) Object.keys(DEFAULTS).forEach((k) => { if (row[k] !== undefined && row[k] !== null) p[k] = row[k]; });
  const { list, name } = await para.getRanges();
  const paraNo = await para.locate(p.surah, p.ayah);
  const pr = list[paraNo - 1];
  return { ...p, started: !!row, para: paraNo, paraName: pr.name, label: `Para ${paraNo} (${pr.name}) · ${name[p.surah]} ${p.surah}:${p.ayah}` };
}

// ranges = [{ surah, from, to }], already checked by the route
async function markRead(userId, date, ranges) {
  const now = new Date();
  const ops = [];
  ranges.forEach((r) => {
    for (let a = r.from; a <= r.to; a++) {
      ops.push({ updateOne: { filter: { user: userId, surah: r.surah, ayah: a }, update: { $set: { lastReadAt: now }, $inc: { times: 1 }, $setOnInsert: { firstReadAt: now } }, upsert: true } });
    }
  });
  if (!ops.length) return 0;
  await ReadAyah.bulkWrite(ops);
  await ReadingDay.updateOne({ user: userId, date }, { $inc: { ayahs: ops.length } }, { upsert: true });
  return ops.length;
}

async function readStats(userId) {
  const rows = await ReadAyah.find({ user: userId }).select('surah ayah').lean();
  const { list, count } = await para.getRanges();
  const set = new Set(rows.map((r) => `${r.surah}:${r.ayah}`));
  const bySurah = {};
  rows.forEach((r) => { bySurah[r.surah] = (bySurah[r.surah] || 0) + 1; });
  const paraRead = list.map((p) => {
    let n = 0;
    p.segments.forEach((seg) => { for (let a = seg.from; a <= seg.to; a++) if (set.has(`${seg.surah}:${a}`)) n++; });
    return { number: p.number, name: p.name, read: n, total: p.ayahCount, percent: Math.round((n / p.ayahCount) * 100) };
  });
  const totalAyahs = Object.values(count).reduce((a, b) => a + b, 0);
  return {
    totalRead: rows.length, totalAyahs, percent: Math.round((rows.length / totalAyahs) * 1000) / 10,
    parasDone: paraRead.filter((p) => p.read >= p.total * COMPLETE_AT).length,
    surahsDone: Object.keys(bySurah).filter((s) => bySurah[s] >= count[s] * COMPLETE_AT).length,
    bySurah, count, paraRead,
  };
}

module.exports = { DEFAULTS, progressView, markRead, readStats };
