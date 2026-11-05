// The learning path from Noorani Qaida to the complete Quran: lessons, quizzes and progress.
const Lesson = require('../models/Lesson');
const LessonProgress = require('../models/LessonProgress');
const readlog = require('./readlog');
const { LEVELS, QUIZ_SIZE, PASS_MARK, COMPLETE_AT } = require('../config/learn');
const { LETTERS, SYL_LETTERS, syllable } = require('../config/arabic');

const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const pick = (arr, n) => shuffle(arr).slice(0, n);
const bad = (message, status = 400) => Object.assign(new Error(message), { status, expose: true });

/* ---------- what each lesson looks like in the path ---------- */
function describe(l, p, stats) {
  const base = { key: l.key, level: l.level, title: l.title, summary: l.summary };
  if (l.surah) {
    const total = stats.count[l.surah];
    const read = stats.bySurah[l.surah] || 0;
    return { ...base, kind: 'surah', percent: Math.min(100, Math.round((read / total) * 100)), done: read >= total * COMPLETE_AT, reader: { mode: 'surah', n: l.surah } };
  }
  if (l.para) {
    const pr = stats.paraRead[l.para - 1];
    return { ...base, kind: 'para', percent: Math.min(100, pr.percent), done: pr.read >= pr.total * COMPLETE_AT, reader: { mode: 'para', n: l.para } };
  }
  return { ...base, kind: 'quiz', done: !!(p && p.done), percent: p && p.done ? 100 : 0, bestScore: p ? p.bestScore : null, attempts: p ? p.attempts : 0 };
}

async function load(userId) {
  const [lessons, rows, stats] = await Promise.all([
    Lesson.find().sort({ level: 1, order: 1 }).lean(),
    LessonProgress.find({ user: userId }).lean(),
    readlog.readStats(userId),
  ]);
  const prog = Object.fromEntries(rows.map((r) => [r.key, r]));
  return { lessons, items: lessons.map((l) => describe(l, prog[l.key], stats)), stats };
}

const summarize = (items) => {
  const done = items.filter((i) => i.done).length;
  const next = items.find((i) => !i.done) || null;
  return { done, total: items.length, percent: items.length ? Math.round((done / items.length) * 100) : 0, next: next && { key: next.key, title: next.title, level: next.level } };
};

async function path(userId) {
  const { items } = await load(userId);
  const levels = LEVELS.map((lv) => {
    const lessons = items.filter((i) => i.level === lv.level);
    const s = summarize(lessons);
    return { ...lv, lessons, done: s.done, total: s.total, percent: s.percent };
  });
  return { overall: summarize(items), levels };
}

async function summary(userId) {
  const { items } = await load(userId);
  const overall = summarize(items);
  return { ...overall, levels: LEVELS.map((lv) => ({ level: lv.level, title: lv.title, percent: summarize(items.filter((i) => i.level === lv.level)).percent })) };
}

async function lesson(userId, key) {
  const { lessons, items } = await load(userId);
  const l = lessons.find((x) => x.key === key);
  if (!l) return null;
  const idx = lessons.indexOf(l);
  const d = items[idx];
  return {
    ...d, body: l.body || [], drills: l.drills || [],
    hasQuiz: d.kind === 'quiz', passMark: Math.round(PASS_MARK * 100), quizSize: QUIZ_SIZE,
    previous: idx > 0 ? items[idx - 1].key : null, next: idx < items.length - 1 ? items[idx + 1].key : null,
  };
}

/* ---------- quizzes ---------- */
// A question is rebuilt from its id when it is graded, so the server never has to remember it.
function poolIds(l) {
  if (l.quizKind === 'letters') return LETTERS.map((_, i) => `L:${i}`);
  if (l.quizKind === 'syllables') return SYL_LETTERS.flatMap((_, i) => [0, 1, 2].map((v) => `S:${i}:${v}`));
  return (l.quiz || []).map((_, i) => `F:${i}`);
}

function build(l, id) {
  const [kind, a, b] = id.split(':');
  const i = Number(a);
  if (kind === 'L' && l.quizKind === 'letters' && LETTERS[i]) {
    const answer = LETTERS[i].name;
    const others = pick(LETTERS.filter((_, k) => k !== i).map((x) => x.name), 3);
    return { id, prompt: 'What is the name of this letter?', display: LETTERS[i].ar, answer, options: shuffle([answer, ...others]) };
  }
  if (kind === 'S' && l.quizKind === 'syllables' && SYL_LETTERS[i] && [0, 1, 2].includes(Number(b))) {
    const v = Number(b);
    const answer = syllable(SYL_LETTERS[i], v).tr;
    const same = [0, 1, 2].filter((x) => x !== v).map((x) => syllable(SYL_LETTERS[i], x).tr);
    const other = syllable(pick(SYL_LETTERS.filter((_, k) => k !== i), 1)[0], v).tr;
    return { id, prompt: 'How is this read?', display: syllable(SYL_LETTERS[i], v).ar, answer, options: shuffle([answer, ...same, other]) };
  }
  if (kind === 'F' && l.quiz && l.quiz[i]) {
    return { id, prompt: l.quiz[i].q, display: null, answer: l.quiz[i].answer, options: shuffle(l.quiz[i].options) };
  }
  return null;
}

async function findQuizLesson(key) {
  const l = await Lesson.findOne({ key }).lean();
  if (!l) throw bad('Lesson not found', 404);
  if (!l.quizKind && !(l.quiz && l.quiz.length)) throw bad('This lesson has no quiz. It is finished by reading.');
  return l;
}

async function makeQuiz(key) {
  const l = await findQuizLesson(key);
  const ids = pick(poolIds(l), QUIZ_SIZE);
  return { key, title: l.title, passMark: Math.round(PASS_MARK * 100), questions: ids.map((id) => { const { answer, ...q } = build(l, id); return q; }) };
}

async function grade(userId, key, answers) {
  const l = await findQuizLesson(key);
  const size = Math.min(QUIZ_SIZE, poolIds(l).length);
  if (!Array.isArray(answers) || answers.length !== size) throw bad(`Answer all ${size} questions`);
  const seen = new Set();
  const results = answers.map((a) => {
    const q = String(a && a.q);
    if (seen.has(q)) throw bad('Each question can be answered once');
    seen.add(q);
    const built = build(l, q);
    if (!built) throw bad('Unknown question');
    return { q, correct: String(a.pick) === built.answer, answer: built.answer };
  });
  const score = results.filter((r) => r.correct).length;
  const passed = score / size >= PASS_MARK;
  const row = await LessonProgress.findOne({ user: userId, key });
  const set = { bestScore: Math.max(score, row ? row.bestScore : 0) };
  if (passed) { set.done = true; if (!row || !row.done) set.doneAt = new Date(); }
  await LessonProgress.findOneAndUpdate({ user: userId, key }, { $set: set, $inc: { attempts: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  return { score, total: size, passed, passMark: Math.round(PASS_MARK * 100), results };
}

module.exports = { path, summary, lesson, makeQuiz, grade };
