const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const auth = require("../middleware/authMiddleware")

const router = express.Router()

const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

// Register a new user
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Please provide all fields" })
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" })
    }

    // Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(400).json({ message: "Email already in use" })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashed = await bcrypt.hash(password, salt)

    // Create new user
    const user = new User({
      username,
      email: email.toLowerCase(),
      password: hashed,
      watchlist: []
    })

    await user.save()

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.json({ token, username: user.username })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide all fields" })
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" })
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    )

    res.json({ token, username: user.username })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

// Get current user profile
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("username email profilePic")
    if (!user) return res.status(404).json({ message: "User not found" })
    res.json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

// Update profile info (username + profile picture)
router.put("/me", auth, async (req, res) => {
  try {
    const { username, profilePic } = req.body

    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: "User not found" })

    if (username) user.username = username
    if (typeof profilePic === "string") user.profilePic = profilePic

    await user.save()

    res.json({ username: user.username, profilePic: user.profilePic })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

// Change password
router.post("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Please provide both current and new passwords" })
    }

    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: "User not found" })

    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" })
    }

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(newPassword, salt)
    await user.save()

    res.json({ message: "Password updated" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete account
router.delete("/delete", auth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id)
    res.json({ message: "Account deleted" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
