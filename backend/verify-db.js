const mongoose = require("mongoose")
const path = require("path")

require("dotenv").config({ path: path.join(__dirname, ".env") })

const User = require("./models/User")
const Review = require("./models/Review")

async function verifyDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log("✓ Connected to MongoDB\n")

    // Get users count
    const userCount = await User.countDocuments()
    console.log(`📊 Total Users: ${userCount}`)

    // List all users
    const users = await User.find({})
    console.log("\n👥 Users in Database:")
    if (users.length === 0) {
      console.log("   (No users found)")
    } else {
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.username} (${user.email})`)
        console.log(`      ID: ${user._id}`)
        console.log(`      Watchlist items: ${user.watchlist.length}`)
        console.log(`      Created: ${user.createdAt}`)
      })
    }

    // Get reviews count
    const reviewCount = await Review.countDocuments()
    console.log(`\n⭐ Total Reviews: ${reviewCount}`)

    if (reviewCount > 0) {
      const reviews = await Review.find({})
      console.log("\n📝 Reviews:")
      reviews.forEach((review, index) => {
        console.log(`   ${index + 1}. Movie ID: ${review.tmdbId} - Rating: ${review.rating}/10`)
      })
    }

    console.log("\n✓ Database verification complete!")
    process.exit(0)
  } catch (err) {
    console.error("✗ Error connecting to MongoDB:", err.message)
    process.exit(1)
  }
}

verifyDatabase()
