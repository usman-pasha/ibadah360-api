if (localStorage.getItem('token')) location.href = 'tracker.html';

let mode = 'login';
const $ = (id) => document.getElementById(id);
const TEXT = {
  login: { title: 'Log in', sub: 'Track your five daily prayers.', btn: 'Log in' },
  register: { title: 'Create account', sub: 'Start tracking your prayers today.', btn: 'Create account' },
  forgot: { title: 'Forgot password', sub: 'Enter your email and we will send you a reset link.', btn: 'Send reset link' },
};

function go(m) { mode = m; render(); }

function render() {
  const t = TEXT[mode];
  $('title').textContent = t.title;
  $('sub').textContent = t.sub;
  $('submit').textContent = t.btn;
  $('nameBox').classList.toggle('hidden', mode !== 'register');
  $('passBox').classList.toggle('hidden', mode === 'forgot');
  $('password').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
  $('error').textContent = '';
  $('info').textContent = '';

  const lk = (label, m) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'link-btn'; b.textContent = label;
    b.onclick = () => go(m);
    return b;
  };
  // Both links always sit side by side
  const links = $('links');
  links.replaceChildren();
  if (mode === 'login') links.append(lk('Create an account', 'register'), lk('Forgot password?', 'forgot'));
  else if (mode === 'register') links.append(lk('Already registered? Log in', 'login'), lk('Forgot password?', 'forgot'));
  else links.append(lk('Back to log in', 'login'), lk('Create an account', 'register'));
}

async function submit() {
  $('error').textContent = '';
  $('info').textContent = '';
  const body = { email: $('email').value };
  if (mode !== 'forgot') body.password = $('password').value;
  if (mode === 'register') body.name = $('name').value;
  try {
    const res = await fetch('/api/auth/' + mode, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return ($('error').textContent = data.message);
    if (mode === 'forgot') return ($('info').textContent = data.message);
    localStorage.setItem('token', data.token);
    localStorage.setItem('name', data.name);
    location.href = 'tracker.html';
  } catch {
    $('error').textContent = 'Cannot reach the server';
  }
}

$('submit').onclick = submit;
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') submit(); });
render();
