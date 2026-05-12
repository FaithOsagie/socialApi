// ============================================================
// profile.js — User profile page
// URL format: /profile.html?user=username
// Works for both guests and logged-in users.
// Logged-in users see a Follow/Unfollow button on other profiles.
// ============================================================

const token    = getToken();
const authUser = getUser();
const isAuthed = !!token;

// Set up nav
(function bootNav() {
  if (isAuthed && authUser) {
    document.getElementById('nav-authed').style.display = 'flex';
    document.getElementById('nav-guest').style.display  = 'none';
    document.getElementById('nav-avatar').textContent   =
      ((authUser.first_name?.[0] || '') + (authUser.last_name?.[0] || '')).toUpperCase() || '?';
    document.getElementById('nav-username').textContent = `@${authUser.username}`;
  } else {
    document.getElementById('nav-authed').style.display = 'none';
    document.getElementById('nav-guest').style.display  = 'flex';
  }
})();

function handleLogout() { clearAuth(); window.location.href = '/login.html'; }

// Get username from URL: /profile.html?user=janedoe
const params   = new URLSearchParams(window.location.search);
const username = params.get('user');

if (!username) {
  window.location.href = '/';
}

let profileUserId = null;
let isFollowing   = false;

// ── LOAD PROFILE ────────────────────────────────────────────
async function loadProfile() {
  try {
    const res  = await fetch(`${API_BASE}/users/${username}`);
    const json = await res.json();
    if (!json.success) throw new Error('User not found');

    const u = json.data;
    profileUserId = u._id;

    document.title = `@${u.username} — Nexly`;

    // Avatar initials
    const initials = ((u.first_name?.[0] || '') + (u.last_name?.[0] || '')).toUpperCase() || '?';
    document.getElementById('profile-avatar').textContent   = initials;
    document.getElementById('profile-name').textContent     = `${u.first_name} ${u.last_name}`;
    document.getElementById('profile-username').textContent = `@${u.username}`;
    document.getElementById('profile-following').textContent = u.following_count ?? '—';
    document.getElementById('profile-followers').textContent = u.followers_count ?? '—';
    document.getElementById('posts-heading').textContent    = `Posts by @${u.username}`;

    // Show follow button only if logged in and viewing someone else's profile
    const followBtn = document.getElementById('follow-btn');
    if (isAuthed && authUser && authUser.username !== u.username) {
      followBtn.style.display = '';
      await checkFollowStatus();
    }

    loadPosts();
  } catch {
    document.getElementById('profile-name').textContent = 'User not found.';
  }
}

// ── CHECK IF ALREADY FOLLOWING ───────────────────────────────
async function checkFollowStatus() {
  try {
    // Fetch the logged-in user's following list and check if this profile is in it
    const res  = await fetch(`${API_BASE}/users/${authUser._id}/following`);
    const json = await res.json();
    if (!json.success) return;

    isFollowing = json.data.some(u => u._id === profileUserId || u.username === username);
    updateFollowBtn();
  } catch { /* silent */ }
}

function updateFollowBtn() {
  const btn = document.getElementById('follow-btn');
  btn.textContent = isFollowing ? 'Unfollow' : 'Follow';
  btn.className   = isFollowing
    ? 'btn btn-secondary'
    : 'btn btn-primary';
}

// ── TOGGLE FOLLOW / UNFOLLOW ─────────────────────────────────
async function toggleFollow() {
  if (!isAuthed || !profileUserId) return;

  const method = isFollowing ? 'DELETE' : 'POST';
  try {
    const res  = await fetch(`${API_BASE}/users/${profileUserId}/follow`, {
      method,
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json.success) { showToast(json.message, 'error'); return; }

    isFollowing = !isFollowing;
    updateFollowBtn();

    // Update the follower count on screen
    const followerEl = document.getElementById('profile-followers');
    const current    = parseInt(followerEl.textContent) || 0;
    followerEl.textContent = current + (isFollowing ? 1 : -1);

    showToast(isFollowing ? `Following @${username}` : `Unfollowed @${username}`);
  } catch {
    showToast('Something went wrong.', 'error');
  }
}

// ── LOAD THIS USER'S PUBLISHED POSTS ────────────────────────
async function loadPosts() {
  const container = document.getElementById('postsContainer');
  container.innerHTML = '<div class="feed-empty" style="padding:40px 0"><div class="skeleton" style="width:60%;height:18px;margin-bottom:12px"></div><div class="skeleton" style="width:80%"></div></div>';

  try {
    const res  = await fetch(`${API_BASE}/posts?author=${username}&limit=20`);
    const json = await res.json();
    if (!json.success) throw new Error();

    const posts = json.data;
    if (posts.length === 0) {
      container.innerHTML = '<div class="feed-empty"><div class="feed-empty-icon">✦</div><div>No published posts yet.</div></div>';
      return;
    }

    container.innerHTML = `<div class="posts-list">${posts.map(renderCard).join('')}</div>`;
  } catch {
    container.innerHTML = '<div class="feed-empty"><div style="color:var(--red)">Could not load posts.</div></div>';
  }
}

function renderCard(post) {
  return `
    <div class="post-card" onclick="window.location='/?post=${post._id}'">
      <div>
        <div class="post-meta">
          <div class="post-avatar">${escHtml(document.getElementById('profile-avatar').textContent)}</div>
          <span class="post-author">@${escHtml(username)}</span>
          <span class="post-dot">·</span>
          <span class="post-time">${timeAgo(post.createdAt)}</span>
        </div>
        <div class="post-title">${escHtml(post.title)}</div>
        <div class="post-excerpt">${escHtml(post.content)}</div>
        ${post.tags?.length
          ? `<div class="post-tags">${post.tags.map(t => `<span class="tag">#${escHtml(t)}</span>`).join('')}</div>`
          : ''}
      </div>
      <div class="post-actions">
        <div class="like-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          ${post.like_count}
        </div>
      </div>
    </div>`;
}

// ── INIT ─────────────────────────────────────────────────────
loadProfile();