if (localStorage.getItem('token')) location.href = 'tracker.html';

let mode = 'login';
const $ = (id) => document.getElementById(id);

function render() {
  const reg = mode === 'register';
  $('title').textContent = reg ? 'Create account' : 'Log in';
  $('submit').textContent = reg ? 'Create account' : 'Log in';
  $('nameBox').classList.toggle('hidden', !reg);
  $('switch').innerHTML = reg
    ? 'Already registered? <a id="toggle">Log in</a>'
    : 'New here? <a id="toggle">Create an account</a>';
  $('toggle').onclick = () => { mode = reg ? 'login' : 'register'; $('error').textContent = ''; render(); };
}

async function submit() {
  $('error').textContent = '';
  const body = { email: $('email').value, password: $('password').value };
  if (mode === 'register') body.name = $('name').value;
  try {
    const res = await fetch('/api/auth/' + mode, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return ($('error').textContent = data.message);
    localStorage.setItem('token', data.token);
    localStorage.setItem('name', data.name);
    location.href = 'tracker.html';
  } catch {
    $('error').textContent = 'Cannot reach the server';
  }
}

$('submit').onclick = submit;
document.addEventListener('keydown', (e) => e.key === 'Enter' && submit());
render();
