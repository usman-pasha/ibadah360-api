/* Daily lesson and quiz. The AI Teacher writes it once a day (the server saves it). The answers stay on the server until
   the student sends theirs, and only the first try of the day counts. */
const dl = { data: null, picks: [] };

function dlStats(s) {
  $('dlStats').textContent = s.completed
    ? `Quizzes done: ${s.completed} · Streak: ${s.streak} day${s.streak === 1 ? '' : 's'} · Average score: ${s.averagePercent}%`
    : 'Do today\'s quiz to start your streak.';
}
function dlLangs(list, current) {
  const box = $('dlLangs');
  box.replaceChildren();
  list.forEach((l) => {
    const b = mk('button', l.code === current ? 'on' : '', l.name);
    b.onclick = () => { localStorage.setItem('dlLang', l.code); showDaily(l.code); };
    box.appendChild(b);
  });
}

function dlQuestion(q, i, review) {
  const card = mk('div', 'card dl-q');
  const t = mk('p', 'dl-qtext', `${i + 1}. ${q.q}`); t.dir = 'auto';
  card.appendChild(t);
  q.options.forEach((o, k) => {
    const row = mk('label', 'dl-opt');
    const r = mk('input'); r.type = 'radio'; r.name = 'dlq' + i; r.value = k; r.disabled = !!review;
    const text = mk('span', '', o); text.dir = 'auto';
    if (review) {
      r.checked = review.chosen === k;
      if (k === review.correct) row.classList.add('ok');
      else if (k === review.chosen) row.classList.add('bad');
    } else r.onchange = () => { dl.picks[i] = k; $('dlSubmit').disabled = dl.picks.some((p) => p === undefined || p < 0); };
    row.append(r, text);
    card.appendChild(row);
  });
  if (review && review.explain) card.appendChild(mk('p', 'src', review.explain));
  return card;
}

function drawDaily() {
  const d = dl.data; const box = $('dlBody');
  box.replaceChildren();
  const lesson = mk('div', 'card');
  const body = mk('p', 'dl-body', d.lesson.body); body.dir = 'auto';
  lesson.append(mk('h3', '', d.lesson.title), mk('p', 'src', 'Topic: ' + d.lesson.topic), body,
    askBtn(`I read today's lesson "${d.lesson.title}". Please explain it again in simpler words with one example.`),
    mk('p', 'src', 'This lesson was written by AI. Check important points with your teacher or imam.'));
  box.appendChild(lesson);

  if (d.result) {
    box.appendChild(mk('h2', 'sub-h', `Your score today: ${d.result.score} of ${d.result.total}`));
    d.lesson.questions.forEach((q, i) => box.appendChild(dlQuestion(q, i, d.result.review[i])));
    box.appendChild(mk('p', 'src', 'Come back tomorrow for a new lesson.'));
    return;
  }
  box.appendChild(mk('h2', 'sub-h', 'Quiz'));
  dl.picks = new Array(d.lesson.questions.length).fill(-1);
  d.lesson.questions.forEach((q, i) => box.appendChild(dlQuestion(q, i, null)));
  const go = mk('button', 'btn', 'Check my answers');
  go.id = 'dlSubmit'; go.disabled = true;
  go.onclick = submitDaily;
  box.append(go, mk('p', 'src', 'Only your first try each day counts.'));
}

async function submitDaily() {
  const go = $('dlSubmit');
  go.disabled = true;
  try {
    const r = await api('/lesson/today/submit', { method: 'POST', body: JSON.stringify({ answers: dl.picks, lang: dl.data.lesson.lang }) });
    dl.data.result = r.result;
    dlStats(r.stats); drawDaily();
    window.scrollTo({ top: $('dlBody').offsetTop, behavior: 'smooth' });
    if (!r.result.already) toast(`You scored ${r.result.score} of ${r.result.total}`);
  } catch (e) { toast(e.message, true); go.disabled = false; }
}

async function showDaily(lang) {
  $('dlBody').replaceChildren(mk('p', 'empty', 'Preparing today\'s lesson…'));
  try {
    const d = await api('/lesson/today?lang=' + encodeURIComponent(lang));
    dl.data = d;
    dlLangs(d.languages, d.lesson.lang); dlStats(d.stats); drawDaily();
  } catch (e) { $('dlBody').replaceChildren(mk('p', 'empty', e.message)); }
}

function loadDaily() { return showDaily(localStorage.getItem('dlLang') || 'en'); }
