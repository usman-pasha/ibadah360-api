/* AI Teacher: a chat tutor for Quran, namaz, duas and basic Islam. The server holds the AI key and the rules.
   This file only shows the chat. The chat is kept on this device only. */
const tc = { messages: [], busy: false, ready: false, key: 'teacherChat:', prefill: '' };
const TC_KEEP = 30;
const TC_STARTERS = [
  'Teach me how to pray Fajr step by step',
  'Explain Surah Al-Fatiha word by word',
  'What are the rules of Noon Saakin in tajweed?',
  'Quiz me on wudu',
  'Teach me the dua before eating',
];

function tcId() { try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).id || 'me'; } catch { return 'me'; } }
function tcSave() { try { localStorage.setItem(tc.key, JSON.stringify(tc.messages.slice(-TC_KEEP))); } catch { /* storage full: ignore */ } }
function tcLoad() {
  tc.key = 'teacherChat:' + tcId();
  try { const v = JSON.parse(localStorage.getItem(tc.key) || '[]'); tc.messages = Array.isArray(v) ? v.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') : []; } catch { tc.messages = []; }
}

function tcBubble(m) {
  const b = mk('div', 'tc-msg ' + (m.role === 'user' ? 'tc-me' : 'tc-ai'));
  const p = mk('p', 'tc-text', m.content); // textContent only: nothing the AI writes can run as code
  p.dir = 'auto';
  b.appendChild(p);
  if (m.role === 'assistant' && 'speechSynthesis' in window) { const l = mk('button', 'chip tc-listen', '🔊 Listen'); l.setAttribute('aria-label', 'Read this answer aloud'); l.onclick = () => tvSpeak(m.content); b.appendChild(l); }
  return b;
}
function tcDraw() {
  const box = $('tcLog');
  box.replaceChildren();
  if (!tc.messages.length) {
    box.appendChild(mk('p', 'src', 'Assalamu alaikum! Ask me anything about the Quran, tajweed, namaz or duas. You can write in English, Urdu, Hindi, Kannada or Arabic.'));
    const row = mk('div', 'tc-starters');
    TC_STARTERS.forEach((t) => { const c = mk('button', 'chip', t); c.onclick = () => tcSend(t); row.appendChild(c); });
    box.appendChild(row);
  } else tc.messages.forEach((m) => box.appendChild(tcBubble(m)));
  box.scrollTop = box.scrollHeight;
}

async function tcSend(text) {
  if (tc.busy) return;
  const q = (text !== undefined ? text : $('tcInput').value).trim();
  if (!q) return;
  if (q.length > 1000) { toast('Please keep the question under 1000 characters', true); return; }
  tc.busy = true;
  $('tcSend').disabled = true; $('tcInput').value = '';
  const history = tc.messages.slice(-8);
  tc.messages.push({ role: 'user', content: q });
  tcDraw();
  const wait = mk('div', 'tc-msg tc-ai'); wait.appendChild(mk('p', 'tc-text', 'Teacher is thinking…'));
  $('tcLog').appendChild(wait); $('tcLog').scrollTop = $('tcLog').scrollHeight;
  try {
    const r = await api('/teacher/ask', { method: 'POST', body: JSON.stringify({ message: q, history }) });
    tc.messages.push({ role: 'assistant', content: r.answer });
    tvOnAnswer(r.answer); // read it aloud if the student asked for that
  } catch (e) {
    tvOnError();
    tc.messages.pop(); // take the unanswered question back so the person can send it again
    $('tcInput').value = q;
    toast(e.message, true);
  }
  tcSave(); tcDraw();
  tc.busy = false; $('tcSend').disabled = false; $('tcInput').focus();
}

async function loadTeacher() {
  if (!tc.ready) {
    tcLoad();
    $('tcSend').onclick = () => tcSend();
    $('tcInput').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); tcSend(); } });
    $('tcClear').onclick = () => { if (!tc.messages.length || confirm('Clear this chat from this device?')) { tc.messages = []; tcSave(); tcDraw(); } };
    tc.ready = true;
    initTeacherVoice();
  }
  const st = await api('/teacher/status');
  $('tcSetup').classList.toggle('hidden', st.enabled);
  $('tcChat').classList.toggle('hidden', !st.enabled);
  if (st.enabled) {
    tcDraw();
    if (tc.prefill) { $('tcInput').value = tc.prefill; tc.prefill = ''; $('tcInput').focus(); } // typed for the student, who can edit it and press Send
  }
}

/* ---------- "Ask Teacher" buttons used on ayahs, duas, hadith, names and lessons ---------- */
function askTeacher(text) {
  tc.prefill = String(text).slice(0, 900);
  view = 'teacher'; closeDrawer(); window.scrollTo(0, 0); loadView();
}
function askBtn(text, label) {
  const b = mk('button', 'chip ask-btn', label || 'Ask Teacher');
  b.setAttribute('aria-label', 'Ask the AI Teacher about this');
  b.onclick = () => askTeacher(text);
  return b;
}
