/* Learn Quran: from Noorani Qaida to the complete Quran. Lessons, quizzes and progress come from the server. */
let lessonKey = null;

function openLesson(key) {
  lessonKey = key;
  view = 'lesson';
  closeDrawer();
  window.scrollTo(0, 0);
  loadView();
}

// Open the Quran reader on a surah or para (used by the Level 3 and 4 lessons)
function openQuranAt(mode, n) {
  qCur = { mode, n, page: 1, at: null };
  view = 'quran';
  window.scrollTo(0, 0);
  loadView();
}

async function loadCourse() {
  const p = await api('/learn');
  const top = mk('div', 'dcard hero');
  top.append(mk('h3', '', 'Your learning path'), mk('p', 'big', `${p.overall.percent}%`), mk('p', '', `${p.overall.done} of ${p.overall.total} lessons done`));
  if (p.overall.next) top.appendChild(goBtn('Continue: ' + p.overall.next.title, () => openLesson(p.overall.next.key), 'fbtn small light'));
  const out = [top];
  p.levels.forEach((lv) => {
    out.push(mk('h2', 'sub-h', `Level ${lv.level} · ${lv.title}`));
    out.push(mk('p', 'src', `${lv.description} (${lv.done} of ${lv.total} done)`), meter(lv.percent));
    lv.lessons.forEach((l, i) => {
      const row = mk('button', 'lrow' + (l.done ? ' done' : ''));
      const info = mk('div');
      info.append(mk('div', 'ltitle', l.title), mk('div', 'lsub', l.summary));
      const side = l.done ? 'Done' : l.kind === 'quiz' ? (l.bestScore ? `Best ${l.bestScore}/5` : 'Quiz') : `${l.percent}% read`;
      row.append(mk('span', 'lnum', l.done ? '✓' : String(i + 1)), info, mk('span', 'lside', side));
      row.onclick = () => openLesson(l.key);
      out.push(row);
    });
  });
  $('courseList').replaceChildren(...out);
}

/* ---------- one lesson ---------- */
async function loadLesson() {
  if (!lessonKey) { view = 'course'; return loadView(); }
  const l = await api('/learn/lessons/' + encodeURIComponent(lessonKey));
  const out = [];
  const head = mk('div', 'card');
  head.append(mk('p', 'src', `Level ${l.level}`), mk('h2', 'date-h', l.title), mk('p', '', l.summary));
  if (l.done) head.appendChild(mk('p', 'badge', 'Completed'));
  out.push(head);

  (l.body || []).forEach((s) => { const c = mk('div', 'card'); c.append(mk('h3', '', s.title), mk('p', '', s.text)); out.push(c); });

  if ((l.drills || []).length) {
    out.push(mk('h2', 'sub-h', 'Practise'));
    const g = mk('div', 'drills');
    l.drills.forEach((d) => {
      const c = mk('div', 'drill');
      const ar = mk('div', 'drill-ar', d.ar); ar.lang = 'ar'; ar.dir = 'rtl';
      c.append(ar, mk('div', 'drill-tr', d.tr || ''));
      if (d.note) c.appendChild(mk('div', 'drill-note', d.note));
      g.appendChild(c);
    });
    out.push(g);
  }

  if (l.hasQuiz) {
    out.push(mk('h2', 'sub-h', 'Quiz'));
    const box = mk('div', 'quiz');
    box.appendChild(mk('p', 'hint', `${l.quizSize} questions. You need ${l.passMark}% to finish this lesson.`));
    box.appendChild(goBtn(l.done ? 'Take the quiz again' : 'Take the quiz', () => startQuiz(l, box), 'btn'));
    out.push(box);
  } else if (l.reader) {
    out.push(mk('h2', 'sub-h', 'Reading'));
    const c = mk('div', 'card');
    c.append(mk('p', '', `${l.percent}% read. It is finished at 95%.`), meter(l.percent), goBtn('Open in the Quran reader', () => openQuranAt(l.reader.mode, l.reader.n), 'btn'));
    out.push(c);
  }

  const nav = mk('div', 'lnav');
  if (l.previous) nav.appendChild(goBtn('‹ Previous lesson', () => openLesson(l.previous), 'fbtn out small'));
  if (l.next) nav.appendChild(goBtn('Next lesson ›', () => openLesson(l.next), 'fbtn small'));
  out.push(nav);
  $('lsBody').replaceChildren(...out);
}

/* ---------- quiz ---------- */
async function startQuiz(l, box) {
  let q;
  try { q = await api(`/learn/lessons/${encodeURIComponent(l.key)}/quiz`); } catch (e) { return toast(e.message, true); }
  const form = mk('div');
  q.questions.forEach((x, i) => {
    const c = mk('div', 'card qz');
    c.appendChild(mk('h3', '', `${i + 1}. ${x.prompt}`));
    if (x.display) { const d = mk('div', 'qz-display', x.display); d.lang = 'ar'; d.dir = 'rtl'; c.appendChild(d); }
    const opts = mk('div', 'radios');
    x.options.forEach((o) => {
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'q' + i; input.value = o;
      const text = mk('span', '', o); text.dir = 'auto';
      const label = mk('label', 'radio'); label.append(input, text);
      opts.appendChild(label);
    });
    c.appendChild(opts);
    form.appendChild(c);
  });
  const submit = goBtn('Check my answers', async () => {
    const answers = q.questions.map((x, i) => { const p = document.querySelector(`input[name="q${i}"]:checked`); return p ? { q: x.id, pick: p.value } : null; });
    if (answers.some((a) => !a)) return toast('Answer every question first', true);
    try {
      const r = await api(`/learn/lessons/${encodeURIComponent(l.key)}/quiz`, { method: 'POST', body: JSON.stringify({ answers }) });
      showResult(l, q, r, box);
    } catch (e) { toast(e.message, true); }
  }, 'btn');
  box.replaceChildren(form, submit);
}

function showResult(l, q, r, box) {
  const head = mk('div', 'card');
  head.append(mk('h2', 'date-h', `${r.score} out of ${r.total}`), mk('p', r.passed ? 'res-ok' : 'res-bad', r.passed ? 'Well done! This lesson is finished.' : `Not yet. You need ${r.passMark}%. Read the lesson again and try once more.`));
  const list = mk('div');
  r.results.forEach((x, i) => {
    const c = mk('div', 'card');
    c.append(mk('p', x.correct ? 'res-ok' : 'res-bad', `${x.correct ? '✓' : '✗'} ${i + 1}. ${q.questions[i].prompt}`));
    if (!x.correct) c.appendChild(mk('p', 'src', 'Right answer: ' + x.answer));
    list.appendChild(c);
  });
  const again = goBtn('Try again', () => startQuiz(l, box), 'fbtn out small');
  const row = mk('div', 'lnav'); row.appendChild(again);
  if (r.passed && l.next) row.appendChild(goBtn('Next lesson ›', () => openLesson(l.next), 'fbtn small'));
  box.replaceChildren(head, list, row);
  window.scrollTo({ top: box.offsetTop - 20, behavior: 'smooth' });
}

function initCourse() {
  $('lsBack').onclick = () => { view = 'course'; window.scrollTo(0, 0); loadView(); };
}
