const express = require("express")
const cors = require("cors")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, ".env") })

const { connectDb } = require("./db")

const app = express()

// Connect to MongoDB
connectDb()

// middleware
app.use(cors())
app.use(express.json())

// serve frontend
app.use(express.static(path.join(__dirname, "../frontend")))

// routes
const authRoutes = require("./routes/auth")
const watchlistRoutes = require("./routes/watchlist")
const reviewRoutes = require("./routes/reviews")

app.use("/api/auth", authRoutes)
app.use("/api/watchlist", watchlistRoutes)
app.use("/api/reviews", reviewRoutes)

// TMDB proxy endpoints (prevents exposing API key in frontend + avoids CORS)
const TMDB_KEY = process.env.TMDB_KEY
const TMDB_BASE = "https://api.themoviedb.org/3"

const OMDB_KEY = process.env.OMDB_KEY
const OMDB_BASE = "http://www.omdbapi.com/"

const XMDB_KEY = process.env.XMDB_KEY
const XMDB_BASE = "https://xmdbapi.com/api/v1"

console.log("TMDB_KEY loaded:", TMDB_KEY ? "YES" : "NO")
console.log("OMDB_KEY loaded:", OMDB_KEY ? "YES" : "NO")
console.log("XMDB_KEY loaded:", XMDB_KEY ? "YES" : "NO")

// Simple in-memory cache for ratings
const cache = {}


function proxyTmdb(req, res, tmdbPath) {
  const url = new URL(`${TMDB_BASE}${tmdbPath}`)
  url.searchParams.set("api_key", TMDB_KEY)

  // forward any other query params the client included
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "api_key") continue
    url.searchParams.set(key, value)
  }

  console.log("TMDB Request URL:", url.toString())

  fetch(url.toString())
    .then((r) => {
      console.log("TMDB Response Status:", r.status)
      if (!r.ok) {
        return r.text().then(text => {
          console.log("TMDB Error Response:", text)
          throw new Error(`TMDB API error: ${r.status} - ${text}`)
        })
      }
      return r.json()
    })
    .then((data) => res.json(data))
    .catch((err) => {
      console.error("TMDB proxy error", err)
      res.status(500).json({ message: "TMDB proxy error", error: err.message })
    })
}

function proxyOmdb(req, res) {
  const url = new URL(OMDB_BASE)
  url.searchParams.set("apikey", OMDB_KEY)

  // forward query params
  for (const [key, value] of Object.entries(req.query)) {
    url.searchParams.set(key, value)
  }

  console.log("OMDB Request URL:", url.toString())

  fetch(url.toString())
    .then((r) => {
      console.log("OMDB Response Status:", r.status)
      if (!r.ok) {
        return r.text().then(text => {
          console.log("OMDB Error Response:", text)
          throw new Error(`OMDB API error: ${r.status} - ${text}`)
        })
      }
      return r.json()
    })
    .then((data) => res.json(data))
    .catch((err) => {
      console.error("OMDB proxy error", err)
      res.status(500).json({ message: "OMDB proxy error", error: err.message })
    })
}

// function proxyXmdb(req, res, xmdbPath) {
//   const url = new URL(`${XMDB_BASE}${xmdbPath}`)
//   // Assuming header or query
//   url.searchParams.set("apiKey", XMDB_KEY)

//   for (const [key, value] of Object.entries(req.query)) {
//     if (key === "apiKey") continue
//     url.searchParams.set(key, value)
//   }

//   console.log("XMDB Request URL:", url.toString())

//   fetch(url.toString())
//     .then((r) => {
//       console.log("XMDB Response Status:", r.status)
//       if (!r.ok) {
//         return r.text().then(text => {
//           console.log("XMDB Error Response:", text)
//           throw new Error(`XMDB API error: ${r.status} - ${text}`)
//         })
//       }
//       return r.json()
//     })
//     .then((data) => res.json(data))
//     .catch((err) => {
//       console.error("XMDB proxy error", err)
//       res.status(500).json({ message: "XMDB proxy error", error: err.message })
//     })
// }

async function getOmdbRatings(imdbId) {
  if (!imdbId) return null
  const cacheKey = `omdb_${imdbId}`
  if (cache[cacheKey]) return cache[cacheKey]

  const url = new URL(OMDB_BASE)
  url.searchParams.set("apikey", OMDB_KEY)
  url.searchParams.set("i", imdbId)

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return null
    const data = await res.json()
    if (data.Response === "False") return null
    cache[cacheKey] = data.Ratings || []
    return cache[cacheKey]
  } catch (err) {
    console.error("OMDB fetch error", err)
    return null
  }
}

async function getXmdbRating(imdbId) {
  if (!imdbId) return null
  const cacheKey = `xmdb_${imdbId}`
  if (cache[cacheKey]) return cache[cacheKey]

  const url = new URL(`${XMDB_BASE}/movies/${imdbId}`)
  url.searchParams.set("apiKey", XMDB_KEY)

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return null
    const data = await res.json()
    if (!data || typeof data.rating !== "number") return null
    cache[cacheKey] = data.rating
    return cache[cacheKey]
  } catch (err) {
    console.error("XMDB fetch error", err)
    return null
  }
}

function normalizeRating(source, value) {
  if (source === "Internet Movie Database") {
    const match = value.match(/(\d+\.?\d*)\/10/)
    return match ? parseFloat(match[1]) : null
  } else if (source === "Rotten Tomatoes") {
    const match = value.match(/(\d+)%/)
    return match ? parseFloat(match[1]) / 10 : null
  } else if (source === "Metacritic") {
    const match = value.match(/(\d+)\/100/)
    return match ? parseFloat(match[1]) / 10 : null
  }
  return null
}

function calculateAverageRating(tmdbRating, omdbRatings, xmdbRating) {
  const ratings = []
  if (tmdbRating) ratings.push(tmdbRating)
  if (omdbRatings) {
    omdbRatings.forEach(r => {
      const norm = normalizeRating(r.Source, r.Value)
      if (norm) ratings.push(norm)
    })
  }
  if (xmdbRating) ratings.push(xmdbRating)
  if (ratings.length === 0) return null
  return ratings.reduce((a, b) => a + b, 0) / ratings.length
}

app.get("/api/tmdb/trending", async (req, res) => {
  const url = new URL(`${TMDB_BASE}/trending/movie/week`)
  url.searchParams.set("api_key", TMDB_KEY)

  for (const [key, value] of Object.entries(req.query)) {
    if (key === "api_key") continue
    url.searchParams.set(key, value)
  }

  try {
    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`)
    }
    const data = await response.json()

    // Enhance each movie with ratings
    const enhancedResults = await Promise.all(data.results.map(async (movie) => {
      // Get movie details for imdb_id
      const detailUrl = new URL(`${TMDB_BASE}/movie/${movie.id}`)
      detailUrl.searchParams.set("api_key", TMDB_KEY)
      let imdbId = null
      try {
        const detailRes = await fetch(detailUrl.toString())
        if (detailRes.ok) {
          const detailData = await detailRes.json()
          imdbId = detailData.imdb_id
        }
      } catch (err) {
        console.error("Error fetching movie details", err)
      }

      // Get OMDB ratings
      const omdbRatings = await getOmdbRatings(imdbId)

      // Get XMDB rating (via IMDb ID)
      const xmdbRating = await getXmdbRating(imdbId)

      // Calculate average
      const averageRating = calculateAverageRating(movie.vote_average, omdbRatings, xmdbRating)

      return {
        ...movie,
        average_rating: averageRating,
        ratings: {
          tmdb: movie.vote_average,
          omdb: omdbRatings,
          xmdb: xmdbRating
        }
      }
    }))

    res.json({ ...data, results: enhancedResults })
  } catch (err) {
    console.error("TMDB trending error", err)
    res.status(500).json({ message: "TMDB trending error", error: err.message })
  }
})

app.get("/api/tmdb/genres", (req, res) => {
  proxyTmdb(req, res, "/genre/movie/list")
})

app.get("/api/tmdb/languages", (req, res) => {
  proxyTmdb(req, res, "/configuration/languages")
})

app.get("/api/tmdb/search", (req, res) => {
  proxyTmdb(req, res, "/search/movie")
})

app.get("/api/tmdb/discover", (req, res) => {
  proxyTmdb(req, res, "/discover/movie")
})

app.get("/api/tmdb/movie/:id", async (req, res) => {
  const url = new URL(`${TMDB_BASE}/movie/${req.params.id}`)
  url.searchParams.set("api_key", TMDB_KEY)

  for (const [key, value] of Object.entries(req.query)) {
    if (key === "api_key") continue
    url.searchParams.set(key, value)
  }

  try {
    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`)
    }
    const movie = await response.json()

    // Get OMDB ratings
    const omdbRatings = await getOmdbRatings(movie.imdb_id)

    // Get XMDB rating (via IMDb ID)
    const xmdbRating = await getXmdbRating(movie.imdb_id)

    // Calculate average
    const averageRating = calculateAverageRating(movie.vote_average, omdbRatings, xmdbRating)

    const enhancedMovie = {
      ...movie,
      average_rating: averageRating,
      ratings: {
        tmdb: movie.vote_average,
        omdb: omdbRatings,
        xmdb: xmdbRating
      }
    }

    res.json(enhancedMovie)
  } catch (err) {
    console.error("TMDB movie error", err)
    res.status(500).json({ message: "TMDB movie error", error: err.message })
  }
})

app.get("/api/tmdb/movie/:id/videos", (req, res) => {
  proxyTmdb(req, res, `/movie/${req.params.id}/videos`)
})

app.get("/api/tmdb/movie/:id/reviews", (req, res) => {
  proxyTmdb(req, res, `/movie/${req.params.id}/reviews`)
})

app.get("/api/tmdb/movie/:id/watch/providers", (req, res) => {
  proxyTmdb(req, res, `/movie/${req.params.id}/watch/providers`)
})

app.get("/api/tmdb/movie/:id/credits", (req, res) => {
  proxyTmdb(req, res, `/movie/${req.params.id}/credits`)
})

app.get("/api/tmdb/movie/:id/similar", (req, res) => {
  proxyTmdb(req, res, `/movie/${req.params.id}/similar`)
})

app.get("/api/omdb", (req, res) => {
  proxyOmdb(req, res)
})

// XMDB API routes are currently disabled because the API endpoint structure is not confirmed.
// Once you have the correct XMDB base URL and route patterns, you can re-enable this.
// app.get("/api/xmdb/*", (req, res) => {
//   const path = req.params[0]
//   proxyXmdb(req, res, path)
// })

app.get("/api/test", (req, res) => {
  res.json({ ok: true, routes: ["/api/tmdb/trending"] })
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
