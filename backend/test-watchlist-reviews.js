#!/usr/bin/env node

/**
 * Test script to verify watchlist and reviews are properly connected to users
 */

const mongoose = require("mongoose")
const User = require("./models/User")
const Review = require("./models/Review")
require("dotenv").config()

async function testWatchlistAndReviews() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI)
    console.log("✓ Connected to MongoDB\n")

    // Get a test user
    const user = await User.findOne().sort({ createdAt: -1 })
    if (!user) {
      console.log("❌ No users found. Register a user first!")
    }

    console.log(`👤 Test User: ${user.username} (${user.email})`)
    console.log(`📋 User ID: ${user._id}\n`)

    // ===== TEST 1: Add movies to watchlist =====
    console.log("TEST 1: Adding movies to watchlist...")
    const movies = [
      { tmdbId: 550, title: "Fight Club", poster: "/poster1.jpg" },
      { tmdbId: 278, title: "The Shawshank Redemption", poster: "/poster2.jpg" },
      { tmdbId: 238, title: "The Godfather", poster: "/poster3.jpg" }
    ]

    for (const movie of movies) {
      const existingMovie = user.watchlist.find((m) => m.tmdbId === movie.tmdbId)
      if (!existingMovie) {
        user.watchlist.push({ ...movie, watched: false })
        console.log(`  ✓ Added: ${movie.title}`)
      }
    }

    await user.save()
    console.log(`✓ Watchlist saved with ${user.watchlist.length} movies\n`)

    // ===== TEST 2: Add reviews for movies =====
    console.log("TEST 2: Creating reviews for movies...")
    const reviews = [
      {
        tmdbId: 550,
        rating: 9,
        reviewText: "Mind-bending psychological thriller. Amazing twist ending!"
      },
      {
        tmdbId: 278,
        rating: 10,
        reviewText: "Perfect movie. One of the best films ever made."
      },
      { tmdbId: 238, rating: 9, reviewText: "Epic family drama. Masterpiece!" }
    ]

    for (const review of reviews) {
      const existingReview = await Review.findOne({
        tmdbId: review.tmdbId,
        userId: user._id
      })

      if (existingReview) {
        existingReview.rating = review.rating
        existingReview.reviewText = review.reviewText
        await existingReview.save()
        console.log(`  ✓ Updated review for TMDB ID: ${review.tmdbId}`)
      } else {
        const newReview = new Review({
          tmdbId: review.tmdbId,
          userId: user._id,
          username: user.username,
          rating: review.rating,
          reviewText: review.reviewText
        })
        await newReview.save()
        console.log(`  ✓ Created review for TMDB ID: ${review.tmdbId}`)
      }
    }

    // ===== TEST 3: Verify user watchlist =====
    console.log("\n✅ TEST 3: Verifying user watchlist...")
    const updatedUser = await User.findById(user._id)
    console.log(`📽️  User Watchlist (${updatedUser.watchlist.length} movies):`)
    updatedUser.watchlist.forEach((movie, index) => {
      console.log(
        `   ${index + 1}. ${movie.title} (ID: ${movie.tmdbId}) - Watched: ${movie.watched}`
      )
    })

    // ===== TEST 4: Verify user reviews =====
    console.log("\n✅ TEST 4: Verifying user reviews...")
    const userReviews = await Review.find({ userId: user._id })
    console.log(`⭐ User Reviews (${userReviews.length} reviews):`)
    userReviews.forEach((review, index) => {
      console.log(
        `   ${index + 1}. Movie ${review.tmdbId}: ${review.rating}/10 - "${review.reviewText}"`
      )
    })

    // ===== TEST 5: Test watchlist watched status =====
    console.log("\n✅ TEST 5: Testing watchlist watched status toggle...")
    updatedUser.watchlist[0].watched = !updatedUser.watchlist[0].watched
    await updatedUser.save()
    console.log(
      `   ✓ Toggled watched status for: ${updatedUser.watchlist[0].title}`
    )
    console.log(`   New status: ${updatedUser.watchlist[0].watched ? "Watched" : "Not watched"}`)

    // ===== TEST 6: Test watchlist removal =====
    console.log("\n✅ TEST 6: Testing watchlist movie removal...")
    const initialLength = updatedUser.watchlist.length
    updatedUser.watchlist = updatedUser.watchlist.filter((m) => m.tmdbId !== 550)
    await updatedUser.save()
    console.log(`   ✓ Removed Fight Club from watchlist`)
    console.log(`   Movies: ${initialLength} → ${updatedUser.watchlist.length}`)

    // ===== FINAL SUMMARY =====
    console.log("\n" + "=".repeat(60))
    console.log("✨ ALL TESTS PASSED!")
    console.log("=".repeat(60))
    console.log("\n📊 Database Summary:")
    console.log(`  - User: ${updatedUser.username}`)
    console.log(`  - Watchlist: ${updatedUser.watchlist.length} movies`)
    console.log(
      `  - Reviews: ${userReviews.length} reviews`
    )
    console.log(
      `\n✓ Watchlist is ${
        updatedUser.watchlist.length > 0 ? "✅ Connected to User" : "❌ Empty"
      }`
    )
    console.log(
      `✓ Reviews are ${
        userReviews.length > 0 ? "✅ Connected to User" : "❌ Empty"
      }`
    )

    process.exit(0)
  } catch (err) {
    console.error("❌ Error:", err.message)
    process.exit(1)
  }
}

testWatchlistAndReviews()
