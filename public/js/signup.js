// Redirect if already logged in
redirectIfAuthed();

async function handleSignup() {
  const btn         = document.getElementById('submit-btn');
  const resultEl    = document.getElementById('result');
  const usernameErr = document.getElementById('username-err');
  const passErr     = document.getElementById('pass-err');

  // Clear previous errors
  usernameErr.textContent = '';
  passErr.textContent     = '';
  resultEl.className      = 'form-result';

  const first    = document.getElementById('first').value.trim();
  const last     = document.getElementById('last').value.trim();
  const username = document.getElementById('username').value.trim();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Client-side validation
  let valid = true;
  if (username.length < 4) {
    usernameErr.textContent = 'Username must be at least 4 characters.';
    valid = false;
  }
  if (password.length < 6) {
    passErr.textContent = 'Password must be at least 6 characters.';
    valid = false;
  }
  if (!valid) return;

  btn.textContent = 'Creating account…';
  btn.disabled    = true;

  try {
    const res  = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: first, last_name: last, username, email, password }),
    });
    const json = await res.json();

    if (json.success) {
      setAuth(json.data.token, json.data.user);
      resultEl.className   = 'form-result success';
      resultEl.textContent = `✓ Welcome, ${json.data.user.first_name}! Redirecting…`;
      setTimeout(() => { window.location.href = '/'; }, 900);
    } else {
      resultEl.className   = 'form-result error';
      resultEl.textContent = `✗ ${json.message}`;
      btn.textContent      = 'Create account';
      btn.disabled         = false;
    }
  } catch {
    resultEl.className   = 'form-result error';
    resultEl.textContent = '✗ Could not reach the server. Is it running?';
    btn.textContent      = 'Create account';
    btn.disabled         = false;
  }
}

document.getElementById('password').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleSignup();
});