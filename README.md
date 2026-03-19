# Popcorn Picks

A full-stack movie discovery & tracking app.

This project includes:

- ✅ **Backend** (Node.js + Express + MongoDB)
  - User auth (email/password + JWT)
  - Watchlist management (add/remove, mark watched)
  - Movie reviews (create/update + list)
  - TMDB/OMDB proxy endpoints (keeps API keys secret)
- ✅ **Frontend** (vanilla HTML/CSS/JS)
  - Login / registration
  - Browse trending movies (with combined rating)
  - Movie details + reviews
  - Watchlist + profile management

---

## 🚀 Quick Start

### 1) Install dependencies

```bash
cd backend
npm install
```

### 2) Configure environment variables

The backend reads config from `backend/.env`. A sample is already included.

Required variables:

- `MONGO_URI` (e.g. `mongodb://127.0.0.1:27017/movieDB`)
- `JWT_SECRET` (any strong secret string)
- `TMDB_KEY` (The Movie Database API key)
- `OMDB_KEY` (OMDb API key)
- `XMDB_KEY` (XMDB API key)

> ⚠️ The repo includes a `.env` with placeholder/test keys. For production or public use, replace them with your own keys and do not commit real secrets.

### 3) Run the server

```bash
npm start
```

The backend will start on:

- `http://localhost:3000`

The frontend is served automatically from the `frontend/` folder.

---

## 📁 Project Structure

```
backend/            # Node/Express server + API + data models
  ├─ routes/        # Auth, watchlist, reviews
  ├─ models/        # MongoDB schemas (User, Review)
  ├─ middleware/    # JWT auth middleware
  ├─ server.js      # Main Express app + TMDB/OMDB proxy routes
  └─ .env           # Environment config (not checked into source control)

frontend/           # Static UI (HTML/CSS/JS)
  ├─ index.html     # Redirects to login or home based on auth state
  ├─ login.html
  ├─ register.html
  ├─ home.html
  ├─ movie.html
  ├─ profile.html
  ├─ watchlist.html
  └─ js/            # Frontend logic for each page
```

---

## ✅ Features

### Authentication
- Register & login with email + password
- JWT-based session stored in `localStorage`
- Protected routes for watchlist, profile updates, and reviews

### Movie discovery & ratings
- Fetches trending movies from TMDB
- Enhances ratings by combining TMDB, OMDb, and XMDB values
- Search, filters (genre/language), and trending lists

### Watchlist
- Add movies to your personal watchlist
- Mark movies as watched / unwatched
- Remove movies from watchlist

### Reviews
- Add/update a review + rating for a movie
- Public review list per movie

---

## 🧩 Backend API (Quick Reference)

### Auth
- `POST /api/auth/register` — register user
- `POST /api/auth/login` — login user
- `GET /api/auth/me` — get profile (requires `Authorization: Bearer <token>`)
- `PUT /api/auth/me` — update username/profile picture
- `POST /api/auth/change-password` — change password
- `DELETE /api/auth/delete` — delete account

### Watchlist (requires auth)
- `GET /api/watchlist` — get current user watchlist
- `POST /api/watchlist/add` — add movie to watchlist
- `POST /api/watchlist/watched/:tmdbId` — toggle watched status
- `DELETE /api/watchlist/remove/:tmdbId` — remove movie

### Reviews
- `POST /api/reviews/add` — add or update a review (requires auth)
- `GET /api/reviews/:tmdbId` — get reviews for a movie

### TMDB/OMDB Proxy
These routes exist so the frontend never needs to store API keys.
- `GET /api/tmdb/trending` — trending movies + enhanced ratings
- `GET /api/tmdb/search` — search movies
- `GET /api/tmdb/movie/:id` — movie details + ratings
- `GET /api/omdb` — OMDb proxy

---

## 🧪 Useful Scripts

From the `backend/` folder:

```bash
npm start      # Start the server (Express + static frontend)
node verify-db.js  # Print basic info about users/reviews in MongoDB
node tmpFetch.js   # Quick local API test (hits /api/test)
node hash-password.js  # Generate a bcrypt hash for a sample password
```

---

## ⚙️ Notes

- The backend serves the frontend files statically, so once the server is running, open:
  - `http://localhost:3000` (redirects automatically based on auth)

- If you change the ports or want to run frontend separately, you can use any static server but must ensure API calls point to `http://localhost:3000` (or your configured backend host).

- API rate limits: TMDB/OMDb APIs are rate limited. Use your own API keys and respect their terms.

---

## 🧠 Troubleshooting

- **MongoDB connection fails**: Ensure MongoDB is running and `MONGO_URI` is correct.
- **Invalid JWT / 401 errors**: Clear `localStorage` or login again.
- **API keys not found**: Make sure `.env` is present and contains `TMDB_KEY`, `OMDB_KEY`, etc.

---

Enjoy building and customizing your movie app! 🎬
