const express = require("express")
const router = express.Router()

const auth = require("../middleware/authMiddleware")
const User = require("../models/User")

// GET WATCHLIST
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    return res.json(user ? user.watchlist : [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

// ADD MOVIE
router.post("/add", auth, async (req, res) => {
  try {
    const { tmdbId, title, poster } = req.body
    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const exists = user.watchlist.find((m) => m.tmdbId === tmdbId)
    if (exists) {
      return res.json({ message: "Already added" })
    }

    user.watchlist.push({ tmdbId, title, poster, watched: false })
    await user.save()
    res.json({ message: "Added to watchlist" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

// TOGGLE WATCHED STATUS
router.post("/watched/:tmdbId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const movie = user.watchlist.find((m) => m.tmdbId === Number(req.params.tmdbId))
    if (!movie) {
      return res.status(404).json({ message: "Movie not in watchlist" })
    }

    movie.watched = !movie.watched
    await user.save()
    res.json({ watched: movie.watched })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

// REMOVE MOVIE
router.delete("/remove/:tmdbId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    user.watchlist = user.watchlist.filter(
      (movie) => movie.tmdbId !== Number(req.params.tmdbId)
    )

    await user.save()
    res.json({ message: "Removed from watchlist" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router