const $ = (id) => document.getElementById(id);
const token = new URLSearchParams(location.search).get('token');
if (!token) $('error').textContent = 'This link is not valid. Please ask for a new reset link.';

async function save() {
  $('error').textContent = '';
  $('info').textContent = '';
  if ($('p1').value.length < 6) return ($('error').textContent = 'Password must be at least 6 characters');
  if ($('p1').value !== $('p2').value) return ($('error').textContent = 'The two passwords do not match');
  try {
    const res = await fetch('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: $('p1').value }),
    });
    const data = await res.json();
    if (!res.ok) return ($('error').textContent = data.message);
    $('info').textContent = data.message;
    setTimeout(() => (location.href = 'index.html'), 2000);
  } catch {
    $('error').textContent = 'Cannot reach the server';
  }
}
$('save').onclick = save;
document.addEventListener('keydown', (e) => e.key === 'Enter' && save());
