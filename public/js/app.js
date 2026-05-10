// ============================================================
// CONFIG — update this to match your running server
// ============================================================
const API_BASE = 'http://localhost:3000/api';

// ============================================================
// STATE — all stored in memory (cleared on page refresh)
// ============================================================
let token        = null;
let currentUser  = null;
let currentPage  = 1;
let totalPages   = 1;
let searchTimer  = null;
let currentTab   = 'public'; // 'public' | 'mine'
let likedPosts   = new Set(); // tracks likes for this session
let currentModalPostId = null;
let currentModalLiked  = false;

// ============================================================
// AUTH STATE — update the whole UI based on login status
// ============================================================
function updateAuthUI() {
  const loggedIn = !!token;

  // Nav: swap logged-out links for logged-in state
  document.getElementById('nav-auth-links').style.display = loggedIn ? 'none' : 'flex';
  const navUser = document.getElementById('nav-user');
  navUser.style.display = loggedIn ? 'flex' : 'none';
  if (loggedIn) {
    document.getElementById('nav-username-display').textContent = `@${currentUser.username}`;
  }

  // Floating create button
  const fab = document.getElementById('create-btn');
  fab.classList.toggle('visible', loggedIn);

  // Feed tabs — "My posts" only shown when logged in
  const tabPublic = document.getElementById('tab-public');
  const tabMine   = document.getElementById('tab-mine');
  tabPublic.style.display = 'inline-block';
  tabMine.style.display   = loggedIn ? 'inline-block' : 'none';
}

// ============================================================
// LOGOUT
// ============================================================
function handleLogout() {
  token       = null;
  currentUser = null;
  likedPosts.clear();
  switchTab('public');
  updateAuthUI();
  showToast('Signed out.');
}

// ============================================================
// REGISTER
// ============================================================
async function handleRegister() {
  const result     = document.getElementById('reg-result');
  const usernameErr = document.getElementById('reg-username-err');
  usernameErr.textContent = '';
  result.className = 'auth-result';

  const username = document.getElementById('reg-username').value.trim();
  if (username.length < 4) {
    usernameErr.textContent = 'Username must be at least 4 characters.';
    return;
  }

  const body = {
    first_name: document.getElementById('reg-first').value.trim(),
    last_name:  document.getElementById('reg-last').value.trim(),
    username,
    email:    document.getElementById('reg-email').value.trim(),
    password: document.getElementById('reg-password').value,
  };

  try {
    const res  = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();

    if (json.success) {
      // Auto-login after register — no need to sign in again
      token       = json.data.token;
      currentUser = json.data.user;
      updateAuthUI();
      result.className = 'auth-result success';
      result.textContent = `✓ Account created! Welcome, ${json.data.user.first_name}.`;
      showToast(`Welcome to Nexly, ${json.data.user.first_name}!`);
      fetchPosts();
    } else {
      result.className = 'auth-result error';
      result.textContent = `✗ ${json.message}`;
    }
  } catch {
    result.className = 'auth-result error';
    result.textContent = '✗ Could not reach the API. Is the server running?';
  }
}

// ============================================================
// LOGIN
// ============================================================
async function handleLogin() {
  const result = document.getElementById('login-result');
  result.className = 'auth-result';

  const body = {
    email:    document.getElementById('login-email').value.trim(),
    password: document.getElementById('login-password').value,
  };

  try {
    const res  = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();

    if (json.success) {
      token       = json.data.token;
      currentUser = json.data.user;
      updateAuthUI();
      result.className = 'auth-result success';
      result.textContent = `✓ Signed in as @${json.data.user.username}`;
      showToast(`Welcome back, ${json.data.user.first_name}!`);
      // Scroll up to feed
      document.getElementById('feed').scrollIntoView({ behavior: 'smooth' });
    } else {
      result.className = 'auth-result error';
      result.textContent = `✗ ${json.message}`;
    }
  } catch {
    result.className = 'auth-result error';
    result.textContent = '✗ Could not reach the API. Is the server running?';
  }
}

// ============================================================
// TABS
// ============================================================
function switchTab(tab) {
  currentTab  = tab;
  currentPage = 1;

  document.getElementById('tab-public').classList.toggle('active', tab === 'public');
  document.getElementById('tab-mine').classList.toggle('active', tab === 'mine');

  // Hide the author filter on "My posts" — it doesn't apply there
  document.getElementById('authorInput').style.display = (tab === 'mine') ? 'none' : '';

  fetchPosts();
}

// ============================================================
// FETCH POSTS
// ============================================================
async function fetchPosts() {
  const search = document.getElementById('searchInput').value.trim();
  const author = document.getElementById('authorInput').value.trim();
  const sort   = document.getElementById('sortSelect').value;

  const params = new URLSearchParams({
    page:  currentPage,
    limit: 10,
    sort,
    ...(search && { search }),
    ...(author && currentTab === 'public' && { author }),
  });

  const endpoint = (currentTab === 'mine')
    ? `${API_BASE}/posts/me`
    : `${API_BASE}/posts`;

  const grid = document.getElementById('postsGrid');
  grid.innerHTML = skeletonHTML();

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res  = await fetch(`${endpoint}?${params}`, { headers });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    const posts = json.data;
    const pg    = json.pagination;
    totalPages  = pg?.total_pages || 1;

    // Update pagination
    const paginationEl = document.getElementById('pagination');
    if (pg && pg.total > 0) {
      paginationEl.style.display = 'flex';
      document.getElementById('pageInfo').textContent =
        `Page ${pg.page} of ${pg.total_pages} · ${pg.total} post${pg.total !== 1 ? 's' : ''}`;
      document.getElementById('prevBtn').disabled = !pg.has_prev_page;
      document.getElementById('nextBtn').disabled = !pg.has_next_page;
    } else {
      paginationEl.style.display = 'none';
    }

    if (posts.length === 0) {
      const emptyMsg = (currentTab === 'mine')
        ? 'No posts yet. Hit the + button to write your first one.'
        : 'No posts found. Try a different search or be the first to write something.';
      grid.innerHTML = `
        <div class="feed-empty">
          <div class="feed-empty-icon">✦</div>
          <div>${emptyMsg}</div>
        </div>`;
      return;
    }

    grid.innerHTML = posts.map(post => renderPostCard(post)).join('');

  } catch (err) {
    grid.innerHTML = `
      <div class="feed-empty">
        <div class="feed-empty-icon">⚠</div>
        <div style="color:var(--red)">Could not connect to the API.<br>
          <span style="color:var(--muted);font-size:12px">Make sure the server is running at ${API_BASE}</span>
        </div>
      </div>`;
  }
}

// Renders a single post card as HTML string
function renderPostCard(post) {
  const isDraft = post.state === 'draft';
  const liked   = likedPosts.has(post._id);

  // Author might not be populated on /posts/me — fallback to currentUser
  const authorName = post.author?.username || currentUser?.username || 'unknown';
  const avatarStr  = getInitials(post.author);

  // Show publish/delete actions for own posts
  const isOwner = currentUser && (
    post.author?._id === currentUser._id ||
    post.author === currentUser._id ||
    currentTab === 'mine'
  );

  return `
    <div class="post-card" onclick="openPost('${post._id}')">
      <div>
        <div class="post-meta">
          <div class="post-avatar">${avatarStr}</div>
          <span class="post-author">${escHtml(authorName)}</span>
          ${isDraft ? '<span class="draft-badge">Draft</span>' : ''}
          <span class="post-dot">·</span>
          <span class="post-time">${timeAgo(post.createdAt)}</span>
        </div>
        <div class="post-title">${escHtml(post.title)}</div>
        <div class="post-excerpt">${escHtml(post.content)}</div>
        ${post.tags?.length
          ? `<div class="post-tags">${post.tags.map(t => `<span class="tag">#${escHtml(t)}</span>`).join('')}</div>`
          : ''}
      </div>
      <div class="post-stats">
        <button
          class="like-btn ${liked ? 'liked' : ''}"
          data-post-id="${post._id}"
          data-liked="${liked}"
          onclick="toggleLike(this, event)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span id="like-count-${post._id}">${post.like_count}</span>
        </button>
        ${isOwner && isDraft ? `
          <button class="action-btn publish-btn" onclick="publishPost('${post._id}', event)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            Publish
          </button>` : ''}
        ${isOwner ? `
          <button class="action-btn delete-btn" onclick="deletePost('${post._id}', event)" title="Delete post">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>` : ''}
      </div>
    </div>`;
}

// ============================================================
// LIKE / UNLIKE (from feed)
// ============================================================
async function toggleLike(btn, event) {
  event.stopPropagation();

  if (!token) {
    showToast('Sign in to like posts');
    return;
  }

  const postId  = btn.dataset.postId;
  const isLiked = btn.dataset.liked === 'true';
  const method  = isLiked ? 'DELETE' : 'POST';

  try {
    const res  = await fetch(`${API_BASE}/posts/${postId}/like`, {
      method,
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json.success) { showToast(json.message); return; }

    // Update local set
    if (isLiked) likedPosts.delete(postId);
    else         likedPosts.add(postId);

    // Toggle button visually
    const newLiked = !isLiked;
    btn.dataset.liked = String(newLiked);
    btn.classList.toggle('liked', newLiked);
    const svgPath = btn.querySelector('path');
    if (svgPath) svgPath.setAttribute('fill', newLiked ? 'currentColor' : 'none');

    // Update count
    const countEl = document.getElementById(`like-count-${postId}`);
    if (countEl) {
      const current = parseInt(countEl.textContent) || 0;
      countEl.textContent = newLiked ? current + 1 : current - 1;
    }
  } catch {
    showToast('Something went wrong.');
  }
}

// ============================================================
// PUBLISH POST
// ============================================================
async function publishPost(postId, event) {
  event.stopPropagation();
  if (!token) return;

  try {
    const res  = await fetch(`${API_BASE}/posts/${postId}/publish`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.success) {
      showToast('Post published!');
      fetchPosts();
    } else {
      showToast(json.message);
    }
  } catch {
    showToast('Could not publish post.');
  }
}

// ============================================================
// DELETE POST
// ============================================================
async function deletePost(postId, event) {
  event.stopPropagation();
  if (!token) return;
  if (!confirm('Delete this post? This cannot be undone.')) return;

  try {
    const res  = await fetch(`${API_BASE}/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.success) {
      showToast('Post deleted.');
      fetchPosts();
    } else {
      showToast(json.message);
    }
  } catch {
    showToast('Could not delete post.');
  }
}

// ============================================================
// READ POST MODAL
// ============================================================
async function openPost(id) {
  currentModalPostId = id;
  currentModalLiked  = likedPosts.has(id);

  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('modal-title').textContent = 'Loading…';
  document.getElementById('modal-content').textContent = '';
  document.getElementById('modal-tags').innerHTML = '';

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res  = await fetch(`${API_BASE}/posts/${id}`, { headers });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    const p = json.data;

    // If the response includes the full likes array, check it
    if (token && currentUser && Array.isArray(p.likes)) {
      currentModalLiked = p.likes.includes(currentUser._id);
      if (currentModalLiked) likedPosts.add(id);
    }

    document.getElementById('modal-meta').innerHTML = `
      <div class="post-avatar">${getInitials(p.author)}</div>
      <span class="post-author">${escHtml(p.author?.username || 'unknown')}</span>
      <span class="post-dot">·</span>
      <span class="post-time">${timeAgo(p.createdAt)}</span>`;

    document.getElementById('modal-title').textContent   = p.title;
    document.getElementById('modal-content').textContent = p.content;
    document.getElementById('modal-date').textContent    = new Date(p.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('modal-likes').textContent   = `${p.like_count} like${p.like_count !== 1 ? 's' : ''}`;
    document.getElementById('modal-tags').innerHTML      = (p.tags || []).map(t => `<span class="tag">#${escHtml(t)}</span>`).join('');

    const likeBtn = document.getElementById('modal-like-btn');
    likeBtn.classList.toggle('liked', currentModalLiked);
    const likeIcon = likeBtn.querySelector('path');
    if (likeIcon) likeIcon.setAttribute('fill', currentModalLiked ? 'currentColor' : 'none');

  } catch {
    document.getElementById('modal-title').textContent = 'Could not load post.';
  }
}

async function toggleModalLike() {
  if (!token) { showToast('Sign in to like posts'); return; }
  if (!currentModalPostId) return;

  const method = currentModalLiked ? 'DELETE' : 'POST';
  try {
    const res  = await fetch(`${API_BASE}/posts/${currentModalPostId}/like`, {
      method,
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json.success) { showToast(json.message); return; }

    currentModalLiked = !currentModalLiked;
    if (currentModalLiked) likedPosts.add(currentModalPostId);
    else                   likedPosts.delete(currentModalPostId);

    const likeBtn = document.getElementById('modal-like-btn');
    likeBtn.classList.toggle('liked', currentModalLiked);
    const likeIcon = likeBtn.querySelector('path');
    if (likeIcon) likeIcon.setAttribute('fill', currentModalLiked ? 'currentColor' : 'none');

    const current  = parseInt(document.getElementById('modal-likes').textContent) || 0;
    const newCount = currentModalLiked ? current + 1 : current - 1;
    document.getElementById('modal-likes').textContent = `${newCount} like${newCount !== 1 ? 's' : ''}`;

  } catch {
    showToast('Something went wrong.');
  }
}

function closeModal(e) { if (e.target === document.getElementById('modalOverlay')) closeModalDirect(); }
function closeModalDirect() {
  document.getElementById('modalOverlay').classList.remove('open');
  currentModalPostId = null;
}

// ============================================================
// CREATE POST MODAL
// ============================================================
function openCreateModal() {
  document.getElementById('createOverlay').classList.add('open');
  document.getElementById('post-title').value   = '';
  document.getElementById('post-content').value = '';
  document.getElementById('post-tags').value    = '';
  document.getElementById('create-error').textContent = '';
}
function closeCreateModal(e) { if (e.target === document.getElementById('createOverlay')) closeCreateDirect(); }
function closeCreateDirect() { document.getElementById('createOverlay').classList.remove('open'); }

async function submitPost(action) {
  const title   = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();
  const tagsRaw = document.getElementById('post-tags').value.trim();
  const errEl   = document.getElementById('create-error');
  errEl.textContent = '';

  if (!title)   { errEl.textContent = 'Title is required.';   return; }
  if (!content) { errEl.textContent = 'Content is required.'; return; }

  const tags = tagsRaw
    ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  try {
    // Step 1: create as draft
    const res  = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title, content, tags }),
    });
    const json = await res.json();
    if (!json.success) { errEl.textContent = json.message; return; }

    // Step 2: publish if requested
    if (action === 'publish') {
      await fetch(`${API_BASE}/posts/${json.data._id}/publish`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    }

    closeCreateDirect();
    showToast(action === 'publish' ? 'Post published!' : 'Draft saved!');

    // Switch to My posts to show the new one
    switchTab('mine');

  } catch {
    errEl.textContent = 'Could not reach the API.';
  }
}

// ============================================================
// UTILS
// ============================================================
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getInitials(author) {
  if (!author || typeof author === 'string') {
    // Not populated — use currentUser if available
    if (currentUser) {
      return ((currentUser.first_name?.[0] || '') + (currentUser.last_name?.[0] || '')).toUpperCase() || '?';
    }
    return '?';
  }
  return ((author.first_name?.[0] || '') + (author.last_name?.[0] || '')).toUpperCase()
    || author.username?.[0]?.toUpperCase()
    || '?';
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function changePage(dir) {
  currentPage = Math.max(1, Math.min(totalPages, currentPage + dir));
  fetchPosts();
}

function skeletonHTML() {
  return `
    <div class="skeleton-card">
      <div style="display:flex;gap:10px;align-items:center">
        <div class="skeleton" style="width:28px;height:28px;border-radius:50%"></div>
        <div class="skeleton" style="width:120px"></div>
      </div>
      <div class="skeleton" style="width:60%;height:20px"></div>
      <div class="skeleton" style="width:90%"></div>
      <div class="skeleton" style="width:75%"></div>
    </div>
    <div class="skeleton-card">
      <div style="display:flex;gap:10px;align-items:center">
        <div class="skeleton" style="width:28px;height:28px;border-radius:50%"></div>
        <div class="skeleton" style="width:100px"></div>
      </div>
      <div class="skeleton" style="width:70%;height:20px"></div>
      <div class="skeleton" style="width:95%"></div>
      <div class="skeleton" style="width:65%"></div>
    </div>`;
}

// ============================================================
// EVENT LISTENERS
// ============================================================
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 40);
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

['searchInput', 'authorInput'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { currentPage = 1; fetchPosts(); }, 400);
  });
});
document.getElementById('sortSelect').addEventListener('change', () => { currentPage = 1; fetchPosts(); });
document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
document.getElementById('reg-password').addEventListener('keydown',  e => { if (e.key === 'Enter') handleRegister(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModalDirect(); closeCreateDirect(); }
});

// ============================================================
// INIT
// ============================================================
updateAuthUI();
fetchPosts();