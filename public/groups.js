/* Group Khatam (friends finish the Quran together, one juz each) and Challenges (a leaderboard over some days). */
const kz = { id: null };
const chg = { id: null };

async function grpInvite(kind, name, code) {
  const text = `Join "${name}" on Ibadah360. Open ${kind}, tap Join with a code, and enter: ${code}`;
  if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { return; } }
  try { await navigator.clipboard.writeText(text); toast('Invite copied. Paste it in a chat.'); } catch { toast('Code: ' + code); }
}
const grpBar = (pct) => { const b = mk('div', 'grp-bar'); const i = mk('i'); i.style.width = pct + '%'; b.appendChild(i); return b; };

/* ================= Group Khatam ================= */
async function loadKhatam() {
  if (!kz.ready) {
    $('kzCreate').onclick = async () => {
      try { const g = await api('/khatam', { method: 'POST', body: JSON.stringify({ name: $('kzName').value }) }); $('kzName').value = ''; kzOpen(g.id, g); } catch (e) { toast(e.message, true); }
    };
    $('kzJoin').onclick = async () => {
      try { const g = await api('/khatam/join', { method: 'POST', body: JSON.stringify({ code: $('kzCode').value }) }); $('kzCode').value = ''; kzOpen(g.id, g); } catch (e) { toast(e.message, true); }
    };
    $('kzBack').onclick = () => { kz.id = null; loadKhatam(); };
    kz.ready = true;
  }
  if (kz.id) return kzOpen(kz.id);
  $('kzHome').classList.remove('hidden'); $('kzDetail').classList.add('hidden');
  try {
    const list = await api('/khatam');
    const box = $('kzList'); box.replaceChildren();
    if (!list.length) box.appendChild(mk('p', 'empty', 'You are not in a group yet. Make one, or join with a code.'));
    list.forEach((g) => {
      const card = mk('button', 'card grp-card');
      card.append(mk('b', '', g.name), mk('span', 'src', `${g.members} member${g.members === 1 ? '' : 's'} · ${g.done} of 30 juz done · round ${g.round}`), grpBar(g.percent));
      card.onclick = () => kzOpen(g.id);
      box.appendChild(card);
    });
  } catch (e) { toast(e.message, true); }
}

async function kzAct(path, body) {
  try { const g = await api(`/khatam/${kz.id}/${path}`, { method: 'POST', body: JSON.stringify(body || {}) }); kzDraw(g); } catch (e) { toast(e.message, true); kzOpen(kz.id); }
}

function kzDraw(g) {
  kz.id = g.id;
  $('kzHome').classList.add('hidden'); $('kzDetail').classList.remove('hidden');
  const box = $('kzBody'); box.replaceChildren();
  const head = mk('div', 'card');
  head.append(mk('h3', '', g.name), mk('p', 'src', `Khatam number ${g.round}${g.completedRounds ? ` · finished ${g.completedRounds} time${g.completedRounds === 1 ? '' : 's'} before` : ''}`),
    grpBar(g.percent), mk('p', '', `${g.done} of 30 juz finished (${g.percent}%)`));
  const inv = mk('div', 'wz-row');
  inv.append(mk('span', 'grp-code', 'Code: ' + g.code));
  const share = mk('button', 'chip', 'Invite friends'); share.onclick = () => grpInvite('Group Khatam', g.name, g.code);
  const refresh = mk('button', 'chip', 'Refresh'); refresh.onclick = () => kzOpen(g.id);
  inv.append(share, refresh);
  head.appendChild(inv);
  if (g.complete) {
    head.appendChild(mk('p', 'grp-win', 'Masha Allah! The whole Quran is finished. May Allah accept it from everyone.'));
    const row = mk('div', 'wz-row');
    row.appendChild(askBtn('Teach me the dua to make after completing the Quran (khatam), with its meaning.', 'Ask for the khatam dua'));
    if (g.isOwner) { const again = mk('button', 'btn', 'Start a new khatam'); again.onclick = () => kzAct('restart'); row.appendChild(again); }
    head.appendChild(row);
  }
  box.appendChild(head);

  const grid = mk('div', 'kz-grid');
  g.juz.forEach((j) => {
    const cell = mk('div', 'kz-juz' + (j.done ? ' done' : j.mine ? ' mine' : j.taken ? ' taken' : ' free'));
    cell.appendChild(mk('b', '', 'Juz ' + j.n));
    if (j.mine) {
      cell.appendChild(mk('span', 'src', j.done ? 'You finished ✓' : 'Yours'));
      if (!j.done) {
        const d = mk('button', 'chip', 'Done ✓'); d.onclick = () => kzAct('done', { juz: j.n, done: true });
        const r = mk('button', 'link-btn', 'Give back'); r.onclick = () => kzAct('release', { juz: j.n });
        cell.append(d, r);
      } else { const u = mk('button', 'link-btn', 'Undo'); u.onclick = () => kzAct('done', { juz: j.n, done: false }); cell.appendChild(u); }
    } else if (j.taken) cell.appendChild(mk('span', 'src', (j.done ? '✓ ' : '') + j.by));
    else { const t = mk('button', 'chip', 'Take'); t.onclick = () => kzAct('claim', { juz: j.n }); cell.appendChild(t); }
    grid.appendChild(cell);
  });
  box.appendChild(grid);

  const mem = mk('div', 'card');
  mem.appendChild(mk('h3', '', `Members (${g.members.length})`));
  g.members.forEach((m) => { const row = mk('div', 'kz-member'); row.append(avatarEl(m.name, '', m.avatar), mk('span', '', `${m.name}${m.me ? ' (you)' : ''}${m.owner ? ' · owner' : ''} — ${m.doneCount} of ${m.juzCount} juz done`)); mem.appendChild(row); });
  const leave = mk('button', 'link-btn', 'Leave this group');
  leave.onclick = async () => { if (!confirm('Leave this group? Your unfinished juz go back to the group.')) return; try { await api(`/khatam/${g.id}/leave`, { method: 'POST' }); kz.id = null; loadKhatam(); } catch (e) { toast(e.message, true); } };
  mem.appendChild(leave);
  box.appendChild(mem);
}

async function kzOpen(id, known) {
  try { kzDraw(known || await api('/khatam/' + id)); }
  catch (e) { toast(e.message, true); kz.id = null; $('kzHome').classList.remove('hidden'); $('kzDetail').classList.add('hidden'); loadKhatam(); }
}

/* ================= Challenges ================= */
async function loadChallenge() {
  if (!chg.ready) {
    $('chCreate').onclick = async () => {
      try {
        const c = await api('/challenge', { method: 'POST', body: JSON.stringify({ name: $('chName').value, metric: $('chMetric').value, days: Number($('chDays').value) }) });
        $('chName').value = ''; chOpen(c.id, c);
      } catch (e) { toast(e.message, true); }
    };
    $('chJoin').onclick = async () => {
      try { const c = await api('/challenge/join', { method: 'POST', body: JSON.stringify({ code: $('chCode').value }) }); $('chCode').value = ''; chOpen(c.id, c); } catch (e) { toast(e.message, true); }
    };
    $('chBack').onclick = () => { chg.id = null; loadChallenge(); };
    chg.ready = true;
  }
  if (chg.id) return chOpen(chg.id);
  $('chHome').classList.remove('hidden'); $('chDetail').classList.add('hidden');
  try {
    const list = await api('/challenge');
    const box = $('chList'); box.replaceChildren();
    if (!list.length) box.appendChild(mk('p', 'empty', 'No challenges yet. Start one with family or friends, or join with a code.'));
    const word = { active: 'Running', upcoming: 'Starts soon', ended: 'Ended' };
    list.forEach((c) => {
      const card = mk('button', 'card grp-card');
      card.append(mk('b', '', c.name), mk('span', 'src', `${c.metricLabel} · ${c.members} member${c.members === 1 ? '' : 's'} · ${word[c.status]}`));
      card.onclick = () => chOpen(c.id);
      box.appendChild(card);
    });
  } catch (e) { toast(e.message, true); }
}

function chDraw(c) {
  chg.id = c.id;
  $('chHome').classList.add('hidden'); $('chDetail').classList.remove('hidden');
  const box = $('chBody'); box.replaceChildren();
  const status = c.status === 'active' ? `${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'} left` : c.status === 'upcoming' ? 'Not started yet' : 'Finished';
  const head = mk('div', 'card');
  head.append(mk('h3', '', c.name), mk('p', 'src', `${c.metricLabel} · ${c.startDate} to ${c.endDate} · ${status}`));
  const inv = mk('div', 'wz-row');
  inv.append(mk('span', 'grp-code', 'Code: ' + c.code));
  const share = mk('button', 'chip', 'Invite'); share.onclick = () => grpInvite('Challenges', c.name, c.code);
  const refresh = mk('button', 'chip', 'Refresh'); refresh.onclick = () => chOpen(c.id);
  inv.append(share, refresh);
  head.appendChild(inv);
  box.appendChild(head);

  const board = mk('div', 'card');
  board.appendChild(mk('h3', '', c.status === 'ended' ? 'Final results' : 'Leaderboard'));
  c.rows.forEach((r) => {
    const row = mk('div', 'ch-row' + (r.me ? ' me' : ''));
    const medal = r.rank === 1 && r.score > 0 ? '🥇' : r.rank === 2 && r.score > 0 ? '🥈' : r.rank === 3 && r.score > 0 ? '🥉' : String(r.rank);
    row.append(mk('span', 'ch-rank', medal), avatarEl(r.name, '', r.avatar), mk('span', 'ch-name', r.name + (r.me ? ' (you)' : '')), mk('b', '', `${r.score} ${c.unit}`));
    board.appendChild(row);
  });
  board.appendChild(mk('p', 'src', 'Scores come from what each member records in the app. Members of a challenge can see each other\'s scores for it, and nothing else.'));
  if (c.metric === 'prayers') board.appendChild(mk('p', 'src', 'Only prayers marked on time count.'));
  const leave = mk('button', 'link-btn', 'Leave this challenge');
  leave.onclick = async () => { if (!confirm('Leave this challenge?')) return; try { await api(`/challenge/${c.id}/leave`, { method: 'POST' }); chg.id = null; loadChallenge(); } catch (e) { toast(e.message, true); } };
  board.appendChild(leave);
  box.appendChild(board);
}

async function chOpen(id, known) {
  try { chDraw(known || await api('/challenge/' + id)); }
  catch (e) { toast(e.message, true); chg.id = null; $('chHome').classList.remove('hidden'); $('chDetail').classList.add('hidden'); loadChallenge(); }
}
