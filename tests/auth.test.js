// ============================================================
// AUTH ENDPOINT TESTS
// ============================================================
// We use Supertest to make HTTP requests to our Express app
// without actually starting a server.
//
// Each test is independent — we clear the DB before each test.
// ============================================================

const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('./setup');

// Connect to the test database before any tests run
beforeAll(async () => await connectTestDB());

// Clear all data before each test to ensure test isolation
beforeEach(async () => await clearTestDB());

// Disconnect after all tests are done
afterAll(async () => await disconnectTestDB());

// ============================================================
// REGISTRATION TESTS
// ============================================================
describe('POST /api/auth/register', () => {
  const validUser = {
    first_name: 'John',
    last_name: 'Doe',
    username: 'johndoe',
    email: 'john@example.com',
    password: 'password123',
  };

  it('should register a new user and return a token', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.username).toBe(validUser.username);
    // Password should NEVER be in the response
    expect(res.body.data.user).not.toHaveProperty('password');
  });

  it('should not return the password in the response', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('should fail if email is already registered', async () => {
    // Register first time
    await request(app).post('/api/auth/register').send(validUser);

    // Try to register again with same email
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, username: 'different' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should fail if username is already taken', async () => {
    await request(app).post('/api/auth/register').send(validUser);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'other@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should fail with missing required fields', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'password123',
      // missing first_name, last_name, username
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should fail with invalid email format', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...validUser,
      email: 'not-an-email',
    });

    expect(res.status).toBe(400);
  });

  it('should fail if password is shorter than 6 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...validUser,
      password: '123',
    });

    expect(res.status).toBe(400);
  });
});

// ============================================================
// LOGIN TESTS
// ============================================================
describe('POST /api/auth/login', () => {
  // Register a user before login tests
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      first_name: 'Jane',
      last_name: 'Doe',
      username: 'janedoe',
      email: 'jane@example.com',
      password: 'secret123',
    });
  });

  it('should login with correct credentials and return a token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'jane@example.com',
      password: 'secret123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
  });

  it('should fail with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'jane@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should fail with unregistered email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'secret123',
    });

    expect(res.status).toBe(401);
  });

  it('should fail with missing credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'jane@example.com',
      // missing password
    });

    expect(res.status).toBe(400);
  });
});