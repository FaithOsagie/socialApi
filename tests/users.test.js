// tests/users.test.js
// ============================================================
// USER & FOLLOW ENDPOINT TESTS
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

const createUser = async (overrides = {}) => {
  const userData = {
    first_name: overrides.first_name || 'Test',
    last_name: overrides.last_name || 'User',
    username: overrides.username || 'testuser',
    email: overrides.email || 'test@example.com',
    password: 'password123',
  };

  const res = await request(app).post('/api/auth/register').send(userData);
  return {
    token: res.body.data.token,
    user: res.body.data.user,
  };
};

// ============================================================
// GET USER PROFILE
// ============================================================
describe('GET /api/users/:username', () => {
  it('should return a public user profile', async () => {
    await createUser({ username: 'alice', email: 'alice@x.com' });

    const res = await request(app).get('/api/users/alice');

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('alice');
    expect(res.body.data.password).toBeUndefined();
  });

  it('should return 404 for non-existent username', async () => {
    const res = await request(app).get('/api/users/ghostuser');
    expect(res.status).toBe(404);
  });

  it('should work without authentication (public)', async () => {
    await createUser({ username: 'bobb', email: 'bobb@x.com' });
    const res = await request(app).get('/api/users/bobb');
    expect(res.status).toBe(200);
  });
});

// ============================================================
// FOLLOW A USER
// ============================================================
describe('POST /api/users/:userId/follow', () => {
  it('should allow a user to follow another user', async () => {
    const { token: aliceToken } = await createUser({ username: 'alice', email: 'a@x.com' });
    const { user: bobb } = await createUser({ username: 'bobb', email: 'b@x.com' });

    const res = await request(app)
      .post(`/api/users/${bobb._id}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should not allow following yourself', async () => {
    const { token, user } = await createUser({ username: 'alice2', email: 'a2@x.com' });

    const res = await request(app)
      .post(`/api/users/${user._id}/follow`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should not allow following the same user twice', async () => {
    const { token: aliceToken } = await createUser({ username: 'ali3', email: 'ali3@x.com' });
    const { user: bobb } = await createUser({ username: 'bob3', email: 'bob3@x.com' });

    await request(app)
      .post(`/api/users/${bobb._id}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`);

    const res = await request(app)
      .post(`/api/users/${bobb._id}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(409);
  });

  it('should require authentication', async () => {
    const { user: bobb } = await createUser({ username: 'bob4', email: 'bob4@x.com' });

    const res = await request(app).post(`/api/users/${bobb._id}/follow`);

    expect(res.status).toBe(401);
  });

  it('should return 404 for non-existent target user', async () => {
    const { token } = await createUser({ username: 'ali4', email: 'ali4@x.com' });
    const fakeId = '64e1234567890abcde123456';

    const res = await request(app)
      .post(`/api/users/${fakeId}/follow`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ============================================================
// UNFOLLOW A USER
// ============================================================
describe('DELETE /api/users/:userId/follow', () => {
  it('should allow a user to unfollow someone they follow', async () => {
    const { token: aliceToken } = await createUser({ username: 'ali5', email: 'ali5@x.com' });
    const { user: bobb } = await createUser({ username: 'bob5', email: 'bob5@x.com' });

    await request(app)
      .post(`/api/users/${bobb._id}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`);

    const res = await request(app)
      .delete(`/api/users/${bobb._id}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
  });

  it('should not allow unfollowing someone you do not follow', async () => {
    const { token: aliceToken } = await createUser({ username: 'ali6', email: 'ali6@x.com' });
    const { user: bobb } = await createUser({ username: 'bob6', email: 'bob6@x.com' });

    const res = await request(app)
      .delete(`/api/users/${bobb._id}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(409);
  });
});

// ============================================================
// GET FOLLOWING LIST
// ============================================================
describe('GET /api/users/:userId/following', () => {
  it('should return the list of users a person follows', async () => {
    const { token: aliceToken, user: alice } = await createUser({ username: 'ali7', email: 'ali7@x.com' });
    const { user: bobb } = await createUser({ username: 'bob7', email: 'bob7@x.com' });

    await request(app)
      .post(`/api/users/${bobb._id}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`);

    const res = await request(app).get(`/api/users/${alice._id}/following`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].username).toBe('bob7');
  });

  it('should be publicly accessible without auth', async () => {
    const { user: alice } = await createUser({ username: 'ali8', email: 'ali8@x.com' });

    const res = await request(app).get(`/api/users/${alice._id}/following`);

    expect(res.status).toBe(200);
  });

  it('should return pagination metadata', async () => {
    const { user: alice } = await createUser({ username: 'ali9', email: 'ali9@x.com' });

    const res = await request(app).get(`/api/users/${alice._id}/following?page=1&limit=10`);

    expect(res.body.pagination).toBeDefined();
  });
});

// ============================================================
// GET FOLLOWERS LIST
// ============================================================
describe('GET /api/users/:userId/followers', () => {
  it('should return the list of users following a person', async () => {
    const { token: aliceToken } = await createUser({ username: 'al10', email: 'al10@x.com' });
    const { user: bobb } = await createUser({ username: 'bo10', email: 'bo10@x.com' });

    await request(app)
      .post(`/api/users/${bobb._id}/follow`)
      .set('Authorization', `Bearer ${aliceToken}`);

    const res = await request(app).get(`/api/users/${bobb._id}/followers`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].username).toBe('al10');
  });
});