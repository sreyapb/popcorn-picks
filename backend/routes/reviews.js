const express = require("express")
const router = express.Router()

const auth = require("../middleware/authMiddleware")
const Review = require("../models/Review")
const User = require("../models/User")

// ADD / UPDATE REVIEW
router.post("/add", auth, async (req, res) => {
  try {
    const { tmdbId, rating, reviewText } = req.body

    if (!tmdbId || !reviewText) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    // Get user for username
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check if review already exists
    const existing = await Review.findOne({
      tmdbId: Number(tmdbId),
      userId: req.user.id
    })

    if (existing) {
      existing.rating = rating
      existing.reviewText = reviewText
      existing.createdAt = new Date()
      await existing.save()
      return res.json({ message: "Review updated" })
    }

    // Create new review
    const newReview = new Review({
      tmdbId: Number(tmdbId),
      userId: req.user.id,
      username: user.username,
      rating,
      reviewText
    })

    await newReview.save()
    res.json({ message: "Review added" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

// GET REVIEWS
router.get("/:tmdbId", async (req, res) => {
  try {
    const reviews = await Review.find({ tmdbId: Number(req.params.tmdbId) })
    res.json(reviews)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router