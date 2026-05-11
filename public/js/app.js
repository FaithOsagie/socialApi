// ============================================================
// GUARD — redirect to login if not authenticated
// ============================================================
requireAuth();

// ============================================================
// STATE
// ============================================================
const user       = getUser();
const token      = getToken();
let currentPage  = 1;
let totalPages   = 1;
let searchTimer  = null;
let currentTab   = 'public';
let likedPosts   = new Set();
let activePostId = null;
let activePostLiked = false;

// ============================================================
// BOOT — populate nav with user info
// ============================================================
(function bootNav() {
  document.getElementById('nav-avatar').textContent =
    getInitials(user, user);
  document.getElementById('nav-username').textContent =
    `@${user.username}`;
})();

// ============================================================
// LOGOUT
// ============================================================
function handleLogout() {
  clearAuth();
  window.location.href = '/login.html';
}

// ============================================================
// TABS
// ============================================================
function switchTab(tab) {
  currentTab  = tab;
  currentPage = 1;

  document.getElementById('tab-public').classList.toggle('active', tab === 'public');
  document.getElementById('tab-mine').classList.toggle('active', tab === 'mine');
  document.getElementById('feed-title').textContent = tab === 'public' ? 'Public feed' : 'My posts';

  // Author filter only makes sense on public feed
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

  const container = document.getElementById('postsContainer');
  container.innerHTML = skeletonHTML();

  try {
    const res  = await fetch(`${endpoint}?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    const posts = json.data;
    const pg    = json.pagination;
    totalPages  = pg?.total_pages || 1;

    // Pagination
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
      container.innerHTML = emptyHTML(currentTab);
      return;
    }

    container.innerHTML = `<div class="posts-list">${posts.map(renderCard).join('')}</div>`;

  } catch (err) {
    container.innerHTML = `
      <div class="feed-empty">
        <div class="feed-empty-icon">⚠</div>
        <div style="color:var(--red)">Could not connect to the API.<br>
          <span style="color:var(--muted);font-size:12px">${err.message || 'Check that your server is running.'}</span>
        </div>
      </div>`;
  }
}

// ============================================================
// RENDER POST CARD
// ============================================================
function renderCard(post) {
  const isDraft  = post.state === 'draft';
  const liked    = likedPosts.has(post._id);
  const isOwner  = currentTab === 'mine' ||
    (post.author?._id === user._id || post.author === user._id);

  const authorName = post.author?.username || user.username;
  const avatarStr  = getInitials(post.author, user);

  return `
    <div class="post-card" onclick="openPost('${post._id}')">
      <div>
        <div class="post-meta">
          <div class="post-avatar">${escHtml(avatarStr)}</div>
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
      <div class="post-actions">
        <button
          class="like-btn ${liked ? 'liked' : ''}"
          data-post-id="${post._id}"
          data-liked="${liked}"
          onclick="toggleLike(this, event)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24"
            fill="${liked ? 'currentColor' : 'none'}"
            stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span id="lc-${post._id}">${post.like_count}</span>
        </button>
        ${isOwner && isDraft ? `
          <button class="action-btn publish-btn" onclick="publishPost('${post._id}', event)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            Publish
          </button>` : ''}
        ${isOwner ? `
          <button class="action-btn delete-btn" onclick="deletePost('${post._id}', event)" title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>` : ''}
      </div>
    </div>`;
}

// ============================================================
// LIKE / UNLIKE (feed)
// ============================================================
async function toggleLike(btn, event) {
  event.stopPropagation();
  const postId  = btn.dataset.postId;
  const isLiked = btn.dataset.liked === 'true';

  try {
    const res  = await fetch(`${API_BASE}/posts/${postId}/like`, {
      method: isLiked ? 'DELETE' : 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json.success) { showToast(json.message, 'error'); return; }

    const newLiked = !isLiked;
    if (newLiked) likedPosts.add(postId);
    else          likedPosts.delete(postId);

    btn.dataset.liked = String(newLiked);
    btn.classList.toggle('liked', newLiked);
    btn.querySelector('path').setAttribute('fill', newLiked ? 'currentColor' : 'none');

    const countEl = document.getElementById(`lc-${postId}`);
    if (countEl) {
      countEl.textContent = parseInt(countEl.textContent) + (newLiked ? 1 : -1);
    }
  } catch {
    showToast('Something went wrong.', 'error');
  }
}

// ============================================================
// PUBLISH POST
// ============================================================
async function publishPost(postId, event) {
  event.stopPropagation();
  try {
    const res  = await fetch(`${API_BASE}/posts/${postId}/publish`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.success) { showToast('Post published!'); fetchPosts(); }
    else showToast(json.message, 'error');
  } catch {
    showToast('Could not publish post.', 'error');
  }
}

// ============================================================
// DELETE POST
// ============================================================
async function deletePost(postId, event) {
  event.stopPropagation();
  if (!confirm('Delete this post? This cannot be undone.')) return;
  try {
    const res  = await fetch(`${API_BASE}/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.success) { showToast('Post deleted.'); fetchPosts(); }
    else showToast(json.message, 'error');
  } catch {
    showToast('Could not delete post.', 'error');
  }
}

// ============================================================
// READ POST MODAL
// ============================================================
async function openPost(id) {
  activePostId    = id;
  activePostLiked = likedPosts.has(id);

  document.getElementById('readOverlay').classList.add('open');
  document.getElementById('read-title').textContent   = 'Loading…';
  document.getElementById('read-content').textContent = '';
  document.getElementById('read-tags').innerHTML      = '';

  try {
    const res  = await fetch(`${API_BASE}/posts/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    const p = json.data;

    // Sync like state from server if likes array is returned
    if (Array.isArray(p.likes)) {
      activePostLiked = p.likes.includes(user._id);
      if (activePostLiked) likedPosts.add(id);
      else likedPosts.delete(id);
    }

    document.getElementById('read-meta').innerHTML = `
      <div class="post-avatar">${escHtml(getInitials(p.author, user))}</div>
      <span class="post-author">${escHtml(p.author?.username || user.username)}</span>
      <span class="post-dot">·</span>
      <span class="post-time">${timeAgo(p.createdAt)}</span>`;

    document.getElementById('read-title').textContent   = p.title;
    document.getElementById('read-content').textContent = p.content;
    document.getElementById('read-date').textContent    =
      new Date(p.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('read-likes').textContent   =
      `${p.like_count} like${p.like_count !== 1 ? 's' : ''}`;
    document.getElementById('read-tags').innerHTML      =
      (p.tags || []).map(t => `<span class="tag">#${escHtml(t)}</span>`).join('');

    const likeBtn  = document.getElementById('read-like-btn');
    likeBtn.classList.toggle('liked', activePostLiked);
    likeBtn.querySelector('path').setAttribute('fill', activePostLiked ? 'currentColor' : 'none');

  } catch {
    document.getElementById('read-title').textContent = 'Could not load post.';
  }
}

async function toggleModalLike() {
  if (!activePostId) return;
  const method = activePostLiked ? 'DELETE' : 'POST';
  try {
    const res  = await fetch(`${API_BASE}/posts/${activePostId}/like`, {
      method,
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();
    if (!json.success) { showToast(json.message, 'error'); return; }

    activePostLiked = !activePostLiked;
    if (activePostLiked) likedPosts.add(activePostId);
    else                 likedPosts.delete(activePostId);

    const likeBtn = document.getElementById('read-like-btn');
    likeBtn.classList.toggle('liked', activePostLiked);
    likeBtn.querySelector('path').setAttribute('fill', activePostLiked ? 'currentColor' : 'none');

    const currentCount = parseInt(document.getElementById('read-likes').textContent) || 0;
    const newCount     = currentCount + (activePostLiked ? 1 : -1);
    document.getElementById('read-likes').textContent = `${newCount} like${newCount !== 1 ? 's' : ''}`;

  } catch { showToast('Something went wrong.', 'error'); }
}

function closeReadModal(e) { if (e.target === document.getElementById('readOverlay')) closeReadDirect(); }
function closeReadDirect()  { document.getElementById('readOverlay').classList.remove('open'); activePostId = null; }

// ============================================================
// CREATE POST MODAL
// ============================================================
function openCreateModal() {
  document.getElementById('post-title').value         = '';
  document.getElementById('post-content').value       = '';
  document.getElementById('post-tags').value          = '';
  document.getElementById('create-error').textContent = '';
  document.getElementById('createOverlay').classList.add('open');
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

  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  try {
    // Create draft first
    const res  = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title, content, tags }),
    });
    const json = await res.json();
    if (!json.success) { errEl.textContent = json.message; return; }

    // Publish if requested
    if (action === 'publish') {
      await fetch(`${API_BASE}/posts/${json.data._id}/publish`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    }

    closeCreateDirect();
    showToast(action === 'publish' ? 'Post published!' : 'Draft saved!');
    switchTab('mine');

  } catch {
    errEl.textContent = 'Could not reach the server.';
  }
}

// ============================================================
// PAGINATION
// ============================================================
function changePage(dir) {
  currentPage = Math.max(1, Math.min(totalPages, currentPage + dir));
  fetchPosts();
}

// ============================================================
// HELPERS
// ============================================================
function skeletonHTML() {
  return `
    <div class="posts-list">
      <div class="skeleton-card">
        <div style="display:flex;gap:10px;align-items:center">
          <div class="skeleton" style="width:26px;height:26px;border-radius:50%"></div>
          <div class="skeleton" style="width:110px"></div>
        </div>
        <div class="skeleton" style="width:58%;height:18px;margin-top:4px"></div>
        <div class="skeleton" style="width:90%"></div>
        <div class="skeleton" style="width:70%"></div>
      </div>
      <div class="skeleton-card">
        <div style="display:flex;gap:10px;align-items:center">
          <div class="skeleton" style="width:26px;height:26px;border-radius:50%"></div>
          <div class="skeleton" style="width:90px"></div>
        </div>
        <div class="skeleton" style="width:65%;height:18px;margin-top:4px"></div>
        <div class="skeleton" style="width:95%"></div>
        <div class="skeleton" style="width:60%"></div>
      </div>
    </div>`;
}

function emptyHTML(tab) {
  const msg = tab === 'mine'
    ? 'No posts yet. Hit the <strong>+</strong> button to write your first one.'
    : 'No posts found. Try a different search.';
  return `
    <div class="feed-empty">
      <div class="feed-empty-icon">✦</div>
      <div>${msg}</div>
    </div>`;
}

// ============================================================
// EVENT LISTENERS
// ============================================================
['searchInput', 'authorInput'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { currentPage = 1; fetchPosts(); }, 380);
  });
});
document.getElementById('sortSelect').addEventListener('change', () => { currentPage = 1; fetchPosts(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeReadDirect(); closeCreateDirect(); }
});

// ============================================================
// INIT
// ============================================================
fetchPosts();