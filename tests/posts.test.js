// tests/posts.test.js
// ============================================================
// POST ENDPOINT TESTS
// ============================================================
// Tests for all post-related endpoints.
//
// We use a helper function "registerAndLogin" to avoid
// repeating auth setup in every test.
// ============================================================

const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./setup');

beforeAll(async () => await connectTestDB());
beforeEach(async () => await clearTestDB());
afterAll(async () => await disconnectTestDB());

// ============================================================
// HELPERS
// ============================================================

// Register a user and return their auth token + user data
const registerAndLogin = async (overrides = {}) => {
  const userData = {
    first_name: 'Test',
    last_name: 'User',
    username: overrides.username || 'testuser',
    email: overrides.email || 'test@example.com',
    password: 'password123',
  };

  const res = await request(app).post('/api/auth/register').send(userData);
  return { token: res.body.data.token, user: res.body.data.user };
};

// Create a post and return it
const createPost = async (token, overrides = {}) => {
  const postData = {
    title: overrides.title || 'Test Post Title',
    content: overrides.content || 'This is the post content.',
    tags: overrides.tags || ['test', 'nodejs'],
  };

  const res = await request(app)
    .post('/api/posts')
    .set('Authorization', `Bearer ${token}`)
    .send(postData);

  return res.body.data;
};

// Create and publish a post
const createAndPublishPost = async (token, overrides = {}) => {
  const post = await createPost(token, overrides);

  await request(app)
    .patch(`/api/posts/${post._id}/publish`)
    .set('Authorization', `Bearer ${token}`);

  return post;
};

// ============================================================
// CREATE POST
// ============================================================
describe('POST /api/posts', () => {
  it('should create a post in draft state by default', async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My Post', content: 'Some content', tags: ['tag1'] });

    expect(res.status).toBe(201);
    expect(res.body.data.state).toBe('draft');
    expect(res.body.data.title).toBe('My Post');
  });

  it('should fail without authentication', async () => {
    const res = await request(app)
      .post('/api/posts')
      .send({ title: 'My Post', content: 'Content' });

    expect(res.status).toBe(401);
  });

  it('should fail with missing title', async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Content without title' });

    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET ALL PUBLISHED POSTS (Public)
// ============================================================
describe('GET /api/posts', () => {
  it('should return only published posts', async () => {
    const { token } = await registerAndLogin();

    // Create one draft and one published post
    await createPost(token, { title: 'Draft Post' });
    await createAndPublishPost(token, { title: 'Published Post' });

    const res = await request(app).get('/api/posts');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Only the published post should appear
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Published Post');
    expect(res.body.data[0].state).toBe('published');
  });

  it('should work without authentication (public endpoint)', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
  });

  it('should return pagination metadata', async () => {
    const { token } = await registerAndLogin();
    await createAndPublishPost(token);

    const res = await request(app).get('/api/posts?page=1&limit=5');

    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('limit');
    expect(res.body.pagination).toHaveProperty('total_pages');
  });

  it('should support searching by title', async () => {
    const { token } = await registerAndLogin();
    await createAndPublishPost(token, { title: 'JavaScript Tutorial', tags: [] });
    await createAndPublishPost(token, { title: 'Python Basics', tags: [] });

    const res = await request(app).get('/api/posts?search=JavaScript');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('JavaScript Tutorial');
  });

  it('should support filtering by author username', async () => {
    const { token: token1 } = await registerAndLogin({ username: 'user1', email: 'u1@example.com' });
    const { token: token2 } = await registerAndLogin({ username: 'user2', email: 'u2@example.com' });

    await createAndPublishPost(token1, { title: 'Post by User 1' });
    await createAndPublishPost(token2, { title: 'Post by User 2' });

    const res = await request(app).get('/api/posts?author=user1');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Post by User 1');
  });

  it('should support sorting by like_count', async () => {
    const { token } = await registerAndLogin();
    await createAndPublishPost(token, { title: 'Low Likes' });
    await createAndPublishPost(token, { title: 'High Likes' });

    const res = await request(app).get('/api/posts?sort=like_count');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });
});

// ============================================================
// GET SINGLE POST (Public)
// ============================================================
describe('GET /api/posts/:id', () => {
  it('should return a single published post with author info', async () => {
    const { token } = await registerAndLogin();
    const post = await createAndPublishPost(token, { title: 'Hello World' });

    const res = await request(app).get(`/api/posts/${post._id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Hello World');
    // Author info should be populated (not just an ID)
    expect(res.body.data.author).toHaveProperty('username');
  });

  it('should not return draft posts', async () => {
    const { token } = await registerAndLogin();
    const post = await createPost(token, { title: 'Draft Only' });

    const res = await request(app).get(`/api/posts/${post._id}`);

    expect(res.status).toBe(404);
  });

  it('should return 404 for non-existent post', async () => {
    const fakeId = '64e1234567890abcde123456';
    const res = await request(app).get(`/api/posts/${fakeId}`);

    expect(res.status).toBe(404);
  });

  it('should return 400 for invalid post ID format', async () => {
    const res = await request(app).get('/api/posts/not-a-valid-id');
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET MY POSTS (Private)
// ============================================================
describe('GET /api/posts/me', () => {
  it('should return all posts (draft and published) for the logged-in user', async () => {
    const { token } = await registerAndLogin();

    await createPost(token, { title: 'My Draft' });
    await createAndPublishPost(token, { title: 'My Published' });

    const res = await request(app)
      .get('/api/posts/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  it('should require authentication', async () => {
    const res = await request(app).get('/api/posts/me');
    expect(res.status).toBe(401);
  });

  it('should only return the logged-in user\'s posts, not others', async () => {
    const { token: t1 } = await registerAndLogin({ username: 'userone', email: 'u1@x.com' });
    const { token: t2 } = await registerAndLogin({ username: 'usertwo', email: 'u2@x.com' });

    await createPost(t1, { title: 'User1 Post' });
    await createPost(t2, { title: 'User2 Post' });

    const res = await request(app)
      .get('/api/posts/me')
      .set('Authorization', `Bearer ${t1}`);

    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('User1 Post');
  });
});

// ============================================================
// PUBLISH POST
// ============================================================
describe('PATCH /api/posts/:id/publish', () => {
  it('should allow the owner to publish a draft post', async () => {
    const { token } = await registerAndLogin();
    const post = await createPost(token);

    const res = await request(app)
      .patch(`/api/posts/${post._id}/publish`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe('published');
  });

  it('should not allow another user to publish the post', async () => {
    const { token: ownerToken } = await registerAndLogin({ username: 'owner', email: 'o@x.com' });
    const { token: otherToken } = await registerAndLogin({ username: 'other', email: 'ot@x.com' });

    const post = await createPost(ownerToken);

    const res = await request(app)
      .patch(`/api/posts/${post._id}/publish`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });
});

// ============================================================
// UPDATE POST
// ============================================================
describe('PUT /api/posts/:id', () => {
  it('should allow the owner to update a draft post', async () => {
    const { token } = await registerAndLogin();
    const post = await createPost(token, { title: 'Original Title' });

    const res = await request(app)
      .put(`/api/posts/${post._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Title');
  });

  it('should allow the owner to update a published post', async () => {
    const { token } = await registerAndLogin();
    const post = await createAndPublishPost(token, { title: 'Published Post' });

    const res = await request(app)
      .put(`/api/posts/${post._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Published Post' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Published Post');
  });

  it('should not allow another user to update the post', async () => {
    const { token: ownerToken } = await registerAndLogin({ username: 'ownuser', email: 'own@x.com' });
    const { token: otherToken } = await registerAndLogin({ username: 'othuser', email: 'oth@x.com' });

    const post = await createPost(ownerToken);

    const res = await request(app)
      .put(`/api/posts/${post._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Hijacked Title' });

    expect(res.status).toBe(403);
  });
});

// ============================================================
// DELETE POST
// ============================================================
describe('DELETE /api/posts/:id', () => {
  it('should allow the owner to delete a draft post', async () => {
    const { token } = await registerAndLogin();
    const post = await createPost(token);

    const res = await request(app)
      .delete(`/api/posts/${post._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('should allow the owner to delete a published post', async () => {
    const { token } = await registerAndLogin();
    const post = await createAndPublishPost(token);

    const res = await request(app)
      .delete(`/api/posts/${post._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('should not allow another user to delete the post', async () => {
    const { token: ownerToken } = await registerAndLogin({ username: 'owneruser', email: 'ow@x.com' });
    const { token: otherToken } = await registerAndLogin({ username: 'otheruser', email: 'ot@x.com' });

    const post = await createPost(ownerToken);

    const res = await request(app)
      .delete(`/api/posts/${post._id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });
});

// ============================================================
// LIKE / UNLIKE POST
// ============================================================
describe('POST /api/posts/:id/like and DELETE /api/posts/:id/like', () => {
  it('should allow a user to like a published post', async () => {
    const { token: ownerToken } = await registerAndLogin({ username: 'poster', email: 'p@x.com' });
    const { token: likerToken } = await registerAndLogin({ username: 'liker', email: 'l@x.com' });

    const post = await createAndPublishPost(ownerToken);

    const res = await request(app)
      .post(`/api/posts/${post._id}/like`)
      .set('Authorization', `Bearer ${likerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.like_count).toBe(1);
  });

  it('should not allow liking the same post twice', async () => {
    const { token: ownerToken } = await registerAndLogin({ username: 'poster2', email: 'po2@x.com' });
    const { token: likerToken } = await registerAndLogin({ username: 'liker2', email: 'li2@x.com' });

    const post = await createAndPublishPost(ownerToken);

    // Like once
    await request(app)
      .post(`/api/posts/${post._id}/like`)
      .set('Authorization', `Bearer ${likerToken}`);

    // Like again — should fail
    const res = await request(app)
      .post(`/api/posts/${post._id}/like`)
      .set('Authorization', `Bearer ${likerToken}`);

    expect(res.status).toBe(409);
  });

  it('should allow unliking a liked post', async () => {
    const { token: ownerToken } = await registerAndLogin({ username: 'poster3', email: 'po3@x.com' });
    const { token: likerToken } = await registerAndLogin({ username: 'liker3', email: 'li3@x.com' });

    const post = await createAndPublishPost(ownerToken);

    await request(app)
      .post(`/api/posts/${post._id}/like`)
      .set('Authorization', `Bearer ${likerToken}`);

    const res = await request(app)
      .delete(`/api/posts/${post._id}/like`)
      .set('Authorization', `Bearer ${likerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.like_count).toBe(0);
  });

  it('should not allow unliking a post that was never liked', async () => {
    const { token: ownerToken } = await registerAndLogin({ username: 'poster4', email: 'po4@x.com' });
    const { token: likerToken } = await registerAndLogin({ username: 'liker4', email: 'li4@x.com' });

    const post = await createAndPublishPost(ownerToken);

    const res = await request(app)
      .delete(`/api/posts/${post._id}/like`)
      .set('Authorization', `Bearer ${likerToken}`);

    expect(res.status).toBe(409);
  });
});