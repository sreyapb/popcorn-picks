const mongoose = require("mongoose")
const path = require("path")

require("dotenv").config({ path: path.join(__dirname, ".env") })

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/movieDB"

async function connectDb() {
  try {
    await mongoose.connect(MONGO_URI)
    console.log("✓ MongoDB connected successfully")
    return true
  } catch (err) {
    console.error("✗ MongoDB connection error:", err.message)
    process.exit(1)
  }
}

module.exports = {
  connectDb,
  mongoose
}
