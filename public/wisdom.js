/* Hadith of the day and the 99 Names of Allah. */
const wz = { shift: 0, nameShift: 0, names: null, quiz: null };

async function wzHadith() {
  const h = await api('/wisdom/hadith?shift=' + wz.shift);
  const box = $('wzHadith');
  box.replaceChildren();
  const t = mk('p', 'wz-text', '“' + h.text + '”'); t.dir = 'auto';
  box.append(mk('h3', '', wz.shift === 0 ? 'Hadith of the day' : 'Hadith ' + h.index + ' of ' + h.total), t,
    mk('p', 'src', 'Source: ' + h.src + (h.note ? ' · ' + h.note : '')),
    mk('p', 'src', 'This is the meaning in simple English, not word for word. Read the full hadith at its source.'));
  const row = mk('div', 'wz-row');
  const prev = mk('button', 'chip', '‹ Another'); prev.onclick = () => { wz.shift--; wzHadith(); };
  const next = mk('button', 'chip', 'Another ›'); next.onclick = () => { wz.shift++; wzHadith(); };
  const copy = mk('button', 'chip', 'Copy'); copy.onclick = () => navigator.clipboard.writeText(`“${h.text}” (${h.src})`).then(() => toast('Copied'), () => toast('Could not copy', true));
  row.append(prev, next, copy, askBtn(`Explain this hadith in simple words and give a practical example: "${h.text}" (${h.src})`));
  box.appendChild(row);
}

function wzNameCard(n, withAsk) {
  const el = mk('div', 'wz-name');
  const info = mk('div', 'wz-info');
  info.append(mk('span', 'wz-tr', `${n.number}. ${n.tr}`), mk('span', 'wz-en', n.en));
  if (withAsk) info.appendChild(askBtn(`Explain the name of Allah "${n.tr}" (${n.en}) in simple words and how I can live by it.`, 'Ask Teacher'));
  const ar = mk('span', 'wz-ar', n.ar); ar.lang = 'ar'; ar.dir = 'rtl';
  el.append(info, ar);
  return el;
}

async function wzToday() {
  const n = await api('/wisdom/names/today?shift=' + wz.nameShift);
  const box = $('wzToday');
  box.replaceChildren(mk('h3', '', wz.nameShift === 0 ? 'Name of the day' : 'Name ' + n.number + ' of 99'), wzNameCard(n, true));
  const row = mk('div', 'wz-row');
  const prev = mk('button', 'chip', '‹ Another'); prev.onclick = () => { wz.nameShift--; wzToday(); };
  const next = mk('button', 'chip', 'Another ›'); next.onclick = () => { wz.nameShift++; wzToday(); };
  row.append(prev, next);
  box.appendChild(row);
}

const wzFold = (s) => String(s).toLowerCase().replace(/[^a-z0-9\u0621-\u064A ]/g, '').replace(/[\u064B-\u065F\u0670]/g, '');
function wzList() {
  const q = wzFold($('wzSearch').value.trim());
  const box = $('wzNames');
  box.replaceChildren();
  const list = wz.names.filter((n) => !q || wzFold(n.tr).includes(q) || wzFold(n.en).includes(q) || String(n.number) === q);
  if (!list.length) box.appendChild(mk('p', 'empty', 'No name found'));
  list.forEach((n) => box.appendChild(wzNameCard(n, true)));
}

/* Practice: 5 names, pick the right meaning */
function wzPractice() {
  const pool = wz.names.slice().sort(() => Math.random() - 0.5);
  wz.quiz = { qs: pool.slice(0, 5).map((n) => { const wrong = pool.filter((x) => x.number !== n.number).slice(0, 3); return { n, options: [n, ...wrong].sort(() => Math.random() - 0.5) }; }), i: 0, score: 0 };
  wzQuestion();
}
function wzQuestion() {
  const z = wz.quiz; const box = $('wzQuiz');
  box.replaceChildren();
  if (z.i >= z.qs.length) {
    box.append(mk('h3', '', `You got ${z.score} of ${z.qs.length}`), mk('p', 'src', z.score === z.qs.length ? 'Masha Allah! Perfect.' : 'Keep going, try again.'));
    const again = mk('button', 'chip', 'Practice again'); again.onclick = wzPractice;
    box.appendChild(again);
    return;
  }
  const q = z.qs[z.i];
  const ar = mk('p', 'wz-quizar', q.n.ar); ar.lang = 'ar'; ar.dir = 'rtl';
  box.append(mk('p', 'src', `Question ${z.i + 1} of ${z.qs.length}: what does this Name mean?`), ar, mk('p', 'src', q.n.tr));
  const opts = mk('div', 'wz-row');
  q.options.forEach((o) => {
    const b = mk('button', 'chip', o.en);
    b.onclick = () => {
      const right = o.number === q.n.number;
      if (right) z.score++;
      opts.querySelectorAll('button').forEach((x) => { x.disabled = true; if (x.textContent === q.n.en) x.classList.add('ok'); });
      if (!right) b.classList.add('bad');
      const nx = mk('button', 'btn', z.i + 1 >= z.qs.length ? 'See score' : 'Next');
      nx.onclick = () => { z.i++; wzQuestion(); };
      box.appendChild(nx);
    };
    opts.appendChild(b);
  });
  box.appendChild(opts);
}

async function loadWisdom() {
  await Promise.all([wzHadith(), wzToday()]);
  if (!wz.names) {
    wz.names = (await api('/wisdom/names')).names;
    $('wzSearch').addEventListener('input', wzList);
    $('wzPractice').onclick = wzPractice;
  }
  wzList();
}
