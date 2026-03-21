const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("./models/User")
require("dotenv").config()

const app = express()
app.use(express.json())

async function connectDb() {
  const mongoose = require("mongoose")
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log("✓ MongoDB connected")
    return true
  } catch (err) {
    console.error("✗ MongoDB error:", err.message)
    return false
  }
}

// Test registration endpoint
app.post("/test-register", async (req, res) => {
  try {
    console.log("📨 Registration request received")
    const { username, email, password } = req.body
    console.log("📝 Data:", { username, email })

    if (!username || !email || !password) {
      console.log("❌ Missing fields")
      return res.status(400).json({ message: "Missing fields" })
    }

    // Check if email exists
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      console.log("❌ Email already exists")
      return res.status(400).json({ message: "Email already in use" })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashed = await bcrypt.hash(password, salt)
    console.log("✓ Password hashed")

    // Create user
    const user = new User({
      username,
      email: email.toLowerCase(),
      password: hashed,
      watchlist: []
    })

    await user.save()
    console.log("✓ User saved to MongoDB:", user._id)

    // Generate token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.json({ token, username: user.username, userId: user._id })
  } catch (err) {
    console.error("❌ Error:", err.message)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

async function start() {
  const connected = await connectDb()
  if (!connected) {
    console.log("❌ Failed to connect to MongoDB")
    process.exit(1)
  }

  const PORT = 3001
  app.listen(PORT, () => {
    console.log(`✓ Test server running on port ${PORT}`)
    console.log("Test with: curl -X POST http://localhost:3001/test-register -H 'Content-Type: application/json' -d '{\"username\":\"test\",\"email\":\"test@test.com\",\"password\":\"pass123\"}'")
  })
}

start()
