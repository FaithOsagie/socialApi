# Nexly

A social media platform where users can write and publish posts, follow other writers, and like content they enjoy. Built with Node.js, Express, and MongoDB.

The public feed is visible to everyone — no account required. Sign up to write posts, like, and follow people.

**Live site:** [https://socialapi-t1sd.onrender.com](https://socialapi-t1sd.onrender.com)
**GitHub:** [https://github.com/FaithOsagie/socialApi](https://github.com/FaithOsagie/socialApi)

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Running the Project](#running-the-project)
- [Running Tests](#running-tests)
- [Frontend Pages](#frontend-pages)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Query Parameters](#query-parameters)
- [Deploying to Render](#deploying-to-render)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB Atlas + Mongoose |
| Authentication | JWT (1 hour expiry) |
| Password hashing | bcryptjs |
| Validation | Joi |
| Testing | Jest + Supertest + mongodb-memory-server |
| Frontend | Vanilla HTML, CSS, JavaScript (no frameworks) |

---

## Project Structure

```
nexly/
├── public/                   # Frontend — served as static files
│   ├── index.html            # Homepage — public feed (no login required)
│   ├── login.html            # Sign in page
│   ├── signup.html           # Create account page
│   ├── profile.html          # User profile page (/profile.html?user=username)
│   ├── css/
│   │   └── style.css         # All shared styles
│   └── js/
│       ├── config.js         # API base URL + auth helpers (sessionStorage)
│       ├── app.js            # Main feed logic (posts, likes, create, my posts)
│       ├── login.js          # Login page logic
│       ├── signup.js         # Signup page logic
│       └── profile.js        # Profile page logic (follow/unfollow)
├── src/
│   ├── app.js                # Express setup (middleware, routes, static files)
│   ├── server.js             # MongoDB connection + server start
│   ├── config/
│   │   └── database.js       # connectDB() function
│   ├── models/
│   │   ├── User.js           # User schema (password hashing, follow arrays)
│   │   └── Post.js           # Post schema (state, likes, tags, indexes)
│   ├── middleware/
│   │   ├── auth.js           # protect + optionalAuth middleware
│   │   ├── validate.js       # Joi schemas + validate() factory
│   │   └── errorHandler.js   # Global error handler
│   ├── controllers/
│   │   ├── authController.js # register, login
│   │   ├── postController.js # CRUD, publish, like/unlike
│   │   └── userController.js # profile, follow, unfollow, followers, following
│   ├── routes/
│   │   ├── authRoutes.js     # /api/auth/*
│   │   ├── postRoutes.js     # /api/posts/*
│   │   └── userRoutes.js     # /api/users/*
│   └── utils/
│       ├── jwt.js            # generateToken(), verifyToken()
│       ├── pagination.js     # getPagination(), buildPaginationMeta()
│       └── response.js       # sendSuccess(), sendError(), sendPaginated()
├── tests/
│   ├── setup.js              # In-memory MongoDB setup for tests
│   ├── auth.test.js          # Auth endpoint tests (12 tests)
│   ├── posts.test.js         # Post endpoint tests (27 tests)
│   └── users.test.js         # User/follow endpoint tests (14 tests)
├── .env.example              # Environment variable template
├── .gitignore
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js v18 or higher
- A free [MongoDB Atlas](https://mongodb.com/atlas) cluster

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/FaithOsagie/socialApi.git
cd socialApi

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Visit `http://localhost:3000` — the homepage loads with the public feed.

---

## Running the Project

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

| URL | What you get |
|---|---|
| `http://localhost:3000` | Homepage — public post feed |
| `http://localhost:3000/login.html` | Sign in page |
| `http://localhost:3000/signup.html` | Create account page |
| `http://localhost:3000/profile.html?user=username` | User profile page |
| `http://localhost:3000/api/posts` | Raw API — all published posts |

---

## Running Tests

Tests use `mongodb-memory-server` which spins up a real MongoDB instance in memory. No external MongoDB connection needed to run tests.

```bash
# Run all tests once
npm test

# Watch mode — re-runs on file changes
npm run test:watch
```

**53 tests** across 3 files:
- `tests/auth.test.js` — register and login (12 tests)
- `tests/posts.test.js` — create, read, update, delete, publish, like/unlike (27 tests)
- `tests/users.test.js` — profile, follow, unfollow, followers, following (14 tests)

---

## Frontend Pages

### Homepage (`/`)
- Always loads first — no login required
- Shows all published posts from the community
- Search posts by title or tag
- Filter by author username
- Sort by newest, most liked, or most discussed
- Click any post to read it in full
- Click any author name to visit their profile
- Guests see a hero banner with sign up / sign in CTAs
- Logged-in users see their avatar, username, and a sign out button in the nav

### Sign In (`/login.html`)
- Email and password login
- Redirects to the homepage on success
- Already logged-in users are redirected away automatically

### Create Account (`/signup.html`)
- First name, last name, username (min 4 chars), email, password (min 6 chars)
- Automatically logs in and redirects to homepage on success
- Already logged-in users are redirected away automatically

### Profile (`/profile.html?user=username`)
- Shows a user's name, follower and following counts, and published posts
- Logged-in users can follow or unfollow directly from this page
- Publicly visible — no login required to view

---

## API Reference

**Base URL:** `https://socialapi-t1sd.onrender.com/api`

All responses follow this shape:

```json
{ "success": true, "message": "...", "data": { ... } }
{ "success": true, "message": "...", "data": [...], "pagination": { ... } }
{ "success": false, "message": "Human readable error message" }
```

---

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Create a new account |
| POST | `/api/auth/login` | ❌ | Sign in and receive a JWT token |

**Register request body:**
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "username": "janedoe",
  "email": "jane@example.com",
  "password": "mypassword123"
}
```

**Login request body:**
```json
{
  "email": "jane@example.com",
  "password": "mypassword123"
}
```

**Response (both):**
```json
{
  "success": true,
  "message": "Logged in successfully.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "...",
      "first_name": "Jane",
      "last_name": "Doe",
      "username": "janedoe",
      "email": "jane@example.com",
      "following_count": 0,
      "followers_count": 0
    }
  }
}
```

---

### Posts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/posts` | ❌ | All published posts (paginated) |
| GET | `/api/posts/:id` | ❌ | Single published post with author info |
| GET | `/api/posts/me` | ✅ | Your own posts — all states |
| POST | `/api/posts` | ✅ | Create a post (starts as draft) |
| PATCH | `/api/posts/:id/publish` | ✅ Owner | Publish a draft post |
| PUT | `/api/posts/:id` | ✅ Owner | Update a post |
| DELETE | `/api/posts/:id` | ✅ Owner | Delete a post |
| POST | `/api/posts/:id/like` | ✅ | Like a published post |
| DELETE | `/api/posts/:id/like` | ✅ | Unlike a published post |

**Create post request body:**
```json
{
  "title": "My First Post",
  "content": "Hello world! This is my first post.",
  "tags": ["intro", "nodejs"]
}
```

**Post states:**
- `draft` — only visible to the owner via `/api/posts/me`
- `published` — visible to everyone via `/api/posts`

---

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users/:username` | ❌ | Get a user's public profile |
| GET | `/api/users/:userId/following` | ❌ | List users this person follows |
| GET | `/api/users/:userId/followers` | ❌ | List users who follow this person |
| POST | `/api/users/:userId/follow` | ✅ | Follow a user |
| DELETE | `/api/users/:userId/follow` | ✅ | Unfollow a user |

**Rules:**
- You cannot follow yourself
- You cannot follow the same user more than once
- You cannot unlike a post you never liked

---

## Authentication

Protected routes require a JWT token in the `Authorization` header:

```
Authorization: Bearer <your_token_here>
```

Tokens expire after **1 hour**. Sign in again to get a new one.

The frontend stores tokens in `sessionStorage` — they clear automatically when the browser tab is closed.

---

## Query Parameters

All list endpoints support these query parameters:

| Parameter | Example | Description |
|---|---|---|
| `page` | `?page=2` | Page number (default: 1) |
| `limit` | `?limit=10` | Results per page (default: 20, max: 100) |
| `sort` | `?sort=like_count` | Sort by: `like_count`, `comment_count`, `timestamp` |
| `search` | `?search=nodejs` | Full-text search on title and tags |
| `author` | `?author=janedoe` | Filter posts by author username |
| `state` | `?state=draft` | Filter by state — useful on `/api/posts/me` |

**Example:**
```
GET /api/posts?search=javascript&sort=like_count&page=1&limit=10
```

**Pagination response:**
```json
{
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "total_pages": 5,
    "has_next_page": true,
    "has_prev_page": false
  }
}
```

---

## Deploying to Render

1. Push your project to GitHub
2. Go to [render.com](https://render.com) and create a new **Web Service**
3. Connect your GitHub repo: `https://github.com/FaithOsagie/socialApi`
4. Set the following:

| Setting | Value |
|---|---|
| **Runtime** | Node |
| **Build command** | `npm install` |
| **Start command** | `npm start` |

5. Add your environment variables under **Environment**:

| Key | Value |
|---|---|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A long random string — keep this private |
| `JWT_EXPIRES_IN` | `1h` |
| `NODE_ENV` | `production` |

6. Deploy — your app will be live at `https://socialapi-t1sd.onrender.com`

---

## HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Unauthenticated — missing or invalid token |
| 403 | Forbidden — authenticated but not the owner |
| 404 | Not found |
| 409 | Conflict — duplicate email, double-like, etc. |
| 500 | Internal server error |