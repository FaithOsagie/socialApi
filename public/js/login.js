// Redirect to app if already logged in
redirectIfAuthed();

async function handleLogin() {
  const emailEl  = document.getElementById('email');
  const passEl   = document.getElementById('password');
  const errEl    = document.getElementById('err');
  const resultEl = document.getElementById('result');
  const btn      = document.getElementById('submit-btn');

  errEl.textContent  = '';
  resultEl.className = 'form-result';

  const email    = emailEl.value.trim();
  const password = passEl.value;

  if (!email)    { errEl.textContent = 'Email is required.';    return; }
  if (!password) { errEl.textContent = 'Password is required.'; return; }

  btn.textContent = 'Signing in…';
  btn.disabled    = true;

  try {
    const res  = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();

    if (json.success) {
      setAuth(json.data.token, json.data.user);
      resultEl.className   = 'form-result success';
      resultEl.textContent = `✓ Signed in as @${json.data.user.username}. Redirecting…`;
      setTimeout(() => { window.location.href = '/'; }, 800);
    } else {
      resultEl.className   = 'form-result error';
      resultEl.textContent = `✗ ${json.message}`;
      btn.textContent      = 'Sign in';
      btn.disabled         = false;
    }
  } catch {
    resultEl.className   = 'form-result error';
    resultEl.textContent = '✗ Could not reach the server. Is it running?';
    btn.textContent      = 'Sign in';
    btn.disabled         = false;
  }
}

// Submit on Enter
document.getElementById('password').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});
document.getElementById('email').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});