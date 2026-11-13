// Daily lesson and quiz. The AI Teacher writes it once per day and language, the server checks its shape and saves it.
const DailyLesson = require('../models/DailyLesson');
const QuizResult = require('../models/QuizResult');
const teacher = require('./teacher');
const { TOPICS, LANGUAGES, QUESTIONS } = require('../config/lessons');
const { dayNumber, addDays } = require('../utils/dates');

const fail = (msg, status) => Object.assign(new Error(msg), { status: status || 503, expose: true });
const langName = (code) => (LANGUAGES.find((l) => l.code === code) || LANGUAGES[0]).name;
const validLang = (code) => (LANGUAGES.some((l) => l.code === code) ? code : 'en');
const topicFor = (date) => TOPICS[dayNumber(date) % TOPICS.length];

const SYSTEM = `You write one short daily lesson and a quiz for Muslim students learning the basics of Islam, the Quran and prayer.
Rules:
- Teach only well known, basic and widely agreed points. If something differs between madhabs, say so in one short sentence. Never invent an ayah, hadith, reference or story.
- The lesson is simple and warm, 90 to 160 words, with a transliteration and meaning whenever you write Arabic.
- Write exactly ${QUESTIONS} multiple choice questions about the lesson. Each has 4 different options and exactly one correct option. Wrong options must be believable but clearly wrong. Spread the correct answer position, do not always use the same one.
- "explain" is one short sentence saying why the answer is right.
Answer with ONLY a JSON object, no other text and no markdown fences, in this shape:
{"title":"...","lesson":"...","questions":[{"q":"...","options":["...","...","...","..."],"answer":0,"explain":"..."}]}
"answer" is the position (0 to 3) of the correct option. Keep the JSON keys in English and write all values in the requested language.`;

// The AI sometimes adds text around the JSON. Take the first { to the last }, then check every part of it.
function parseLesson(text) {
  const a = text.indexOf('{'); const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('no json');
  const j = JSON.parse(text.slice(a, b + 1));
  const str = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;
  if (!str(j.title, 3, 120) || !str(j.lesson, 60, 2000) || !Array.isArray(j.questions) || j.questions.length < QUESTIONS) throw new Error('bad shape');
  const questions = j.questions.slice(0, QUESTIONS).map((q) => {
    if (!q || !str(q.q, 5, 300) || !Array.isArray(q.options) || q.options.length !== 4 || !q.options.every((o) => str(o, 1, 200))) throw new Error('bad question');
    const opts = q.options.map((o) => o.trim());
    if (new Set(opts).size !== 4) throw new Error('same options');
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) throw new Error('bad answer');
    return { q: q.q.trim(), options: opts, answer: q.answer, explain: str(q.explain, 1, 400) ? q.explain.trim() : '' };
  });
  return { title: j.title.trim(), body: j.lesson.trim(), questions };
}

async function generate(date, lang) {
  const topic = topicFor(date);
  const user = `Topic: ${topic}\nLanguage: ${langName(lang)}`;
  let last;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await teacher.chat([{ role: 'system', content: SYSTEM }, { role: 'user', content: user }], { maxTokens: 2200, temperature: 0.4 });
    try { return { topic, ...parseLesson(text) }; } catch (e) { last = e; console.error('Daily lesson: the AI answer was not usable (' + e.message + '), attempt ' + (attempt + 1)); }
  }
  throw fail('The AI could not write today\'s lesson properly. Please try again in a moment.');
}

const inflight = {};
async function getLesson(date, lang) {
  const saved = await DailyLesson.findOne({ date, lang }).lean();
  if (saved) return saved;
  const key = date + lang;
  if (!inflight[key]) {
    inflight[key] = generate(date, lang)
      .then(async (l) => { await DailyLesson.updateOne({ date, lang }, { $setOnInsert: { date, lang, ...l } }, { upsert: true }); return DailyLesson.findOne({ date, lang }).lean(); })
      .finally(() => { delete inflight[key]; });
  }
  return inflight[key];
}

const publicLesson = (l) => ({ title: l.title, topic: l.topic, body: l.body, lang: l.lang, questions: l.questions.map((q) => ({ q: q.q, options: q.options })) });
const reviewOf = (l, answers) => l.questions.map((q, i) => ({ correct: q.answer, chosen: answers[i], explain: q.explain || '' }));

// Today's lesson. If the person already did the quiz, the lesson in the language they used comes back with their review.
async function today(userId, date, wantLang) {
  const done = await QuizResult.findOne({ user: userId, date }).lean();
  const lang = done ? done.lang : validLang(wantLang);
  const l = await getLesson(date, lang);
  return { date, lesson: publicLesson(l), result: done ? { score: done.score, total: done.total, review: reviewOf(l, done.answers) } : null };
}

async function submit(userId, date, wantLang, answers) {
  const done = await QuizResult.findOne({ user: userId, date }).lean();
  const lang = done ? done.lang : validLang(wantLang);
  const l = await getLesson(date, lang);
  if (done) return { score: done.score, total: done.total, review: reviewOf(l, done.answers), already: true };
  if (!Array.isArray(answers) || answers.length !== l.questions.length || !answers.every((a) => Number.isInteger(a) && a >= 0 && a <= 3)) throw fail('Please answer every question', 400);
  const score = l.questions.reduce((n, q, i) => n + (q.answer === answers[i] ? 1 : 0), 0);
  try { await QuizResult.create({ user: userId, date, lang, score, total: l.questions.length, answers }); }
  catch (e) { if (e.code !== 11000) throw e; return submit(userId, date, wantLang, answers); } // double tap: the first one already counted
  return { score, total: l.questions.length, review: reviewOf(l, answers), already: false };
}

async function stats(userId, date) {
  const rows = await QuizResult.find({ user: userId }).select('date score total').sort({ date: -1 }).lean();
  const days = new Set(rows.map((r) => r.date));
  let streak = 0; let d = days.has(date) ? date : addDays(date, -1); // a day not done yet does not break the streak
  while (days.has(d)) { streak++; d = addDays(d, -1); }
  const total = rows.reduce((n, r) => n + r.total, 0);
  const score = rows.reduce((n, r) => n + r.score, 0);
  return { completed: rows.length, streak, averagePercent: total ? Math.round((score / total) * 100) : 0, doneToday: days.has(date) };
}

module.exports = { today, submit, stats, parseLesson, validLang };
