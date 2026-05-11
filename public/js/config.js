// ============================================================
// CONFIG
// Auto-detects the server URL so it works on any port.
// No need to hardcode localhost:3000.
// ============================================================
const API_BASE = `${window.location.origin}/api`;

// ============================================================
// AUTH HELPERS — sessionStorage so auth persists across pages
// but clears when the browser tab closes.
// ============================================================
function getToken() {
  return sessionStorage.getItem('nexly_token');
}

function getUser() {
  const raw = sessionStorage.getItem('nexly_user');
  return raw ? JSON.parse(raw) : null;
}

function setAuth(token, user) {
  sessionStorage.setItem('nexly_token', token);
  sessionStorage.setItem('nexly_user', JSON.stringify(user));
}

function clearAuth() {
  sessionStorage.removeItem('nexly_token');
  sessionStorage.removeItem('nexly_user');
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = '/login.html';
  }
}

function redirectIfAuthed() {
  if (getToken()) {
    window.location.href = '/';
  }
}

// ============================================================
// SHARED UTILS
// ============================================================
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getInitials(author, fallbackUser) {
  const source = (author && typeof author === 'object') ? author : fallbackUser;
  if (!source) return '?';
  return ((source.first_name?.[0] || '') + (source.last_name?.[0] || '')).toUpperCase()
    || source.username?.[0]?.toUpperCase()
    || '?';
}

function showToast(msg, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toast-msg').textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3200);
}