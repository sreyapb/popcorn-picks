const token = localStorage.getItem("token")

function requireAuth() {
  if (!token) {
    window.location.href = "login.html"
  }
}

function showMessage(msg, isError = false) {
  const el = document.getElementById("profileMessage")
  el.textContent = msg
  el.classList.remove("hidden")
  el.style.background = isError ? "rgba(220, 50, 50, 0.18)" : "rgba(20, 160, 80, 0.18)"
  el.style.color = isError ? "#ffdddd" : "#d0ffd0"
}

function updateHeaderProfile(username) {
  const nameEl = document.getElementById("profileName")
  const avatarEl = document.getElementById("profileAvatar")
  if (nameEl && username) {
    nameEl.textContent = username
    localStorage.setItem("username", username)
  }

  if (avatarEl) {
    avatarEl.style.backgroundImage = ""
    avatarEl.style.backgroundColor = "#000"
    avatarEl.textContent = (username || "?")[0]?.toUpperCase() || "👤"
  }
}

function clearMessage() {
  const el = document.getElementById("profileMessage")
  el.textContent = ""
  el.classList.add("hidden")
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Request failed: ${res.status} — ${body}`)
  }
  return res.json()
}

async function loadProfile() {
  try {
    const profile = await fetchJson("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    })

    const usernameInput = document.getElementById("username")
    usernameInput.value = profile.username || ""
    document.getElementById("email").value = profile.email || ""

    updateHeaderProfile(usernameInput.value)
  } catch (err) {
    console.error(err)
    showMessage("Unable to load profile. Try refreshing.", true)
  }
}

async function saveProfile(event) {
  event.preventDefault()
  clearMessage()

  const username = document.getElementById("username").value.trim()
  if (!username) {
    showMessage("Your display name cannot be empty.", true)
    return
  }

  try {
    const data = await fetchJson("/api/auth/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ username })
    })

    localStorage.setItem("username", data.username)
    showMessage("Profile updated successfully.")
  } catch (err) {
    console.error(err)
    showMessage("Unable to update profile.", true)
  }
}

async function changePassword() {
  clearMessage()

  const currentPassword = document.getElementById("currentPassword").value
  const newPassword = document.getElementById("newPassword").value
  const confirmPassword = document.getElementById("confirmPassword").value

  if (!currentPassword || !newPassword || !confirmPassword) {
    showMessage("Please fill in all password fields.", true)
    return
  }

  if (newPassword !== confirmPassword) {
    showMessage("New passwords do not match.", true)
    return
  }

  try {
    await fetchJson("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    })

    document.getElementById("currentPassword").value = ""
    document.getElementById("newPassword").value = ""
    document.getElementById("confirmPassword").value = ""

    showMessage("Password updated successfully.")
  } catch (err) {
    console.error(err)
    showMessage(err.message || "Unable to update password.", true)
  }
}

async function deleteAccount() {
  const confirmed = confirm(
    "Deleting your account is permanent. Are you sure you want to continue?"
  )
  if (!confirmed) return

  try {
    await fetchJson("/api/auth/delete", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })

    localStorage.removeItem("token")
    localStorage.removeItem("username")
    window.location.href = "login.html"
  } catch (err) {
    console.error(err)
    showMessage("Unable to delete account right now.", true)
  }
}

function init() {
  requireAuth()

  document.getElementById("profileForm").addEventListener("submit", saveProfile)
  document.getElementById("changePasswordBtn").addEventListener("click", changePassword)
  document.getElementById("deleteAccountBtn").addEventListener("click", deleteAccount)
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token")
    localStorage.removeItem("username")
    window.location.href = "login.html"
  })

  const usernameInput = document.getElementById("username")
  usernameInput.addEventListener("input", (event) => {
    updateHeaderProfile(event.target.value)
  })

  // Dropdown navigation
  const profileBtn = document.getElementById("profileBtn")
  if (profileBtn) {
    profileBtn.addEventListener("click", (event) => {
      event.stopPropagation()
      const dropdown = document.getElementById("profileDropdown")
      dropdown.classList.toggle("hidden")
    })
  }

  const profileDropdown = document.getElementById("profileDropdown")
  if (profileDropdown) {
    profileDropdown.addEventListener("click", (event) => event.stopPropagation())
  }

  document.addEventListener("click", () => {
    const dropdown = document.getElementById("profileDropdown")
    dropdown.classList.add("hidden")
  })

  document.getElementById("editProfileBtn").addEventListener("click", () => {
    window.location.href = "profile.html"
  })
  document.getElementById("watchlistNavBtn").addEventListener("click", () => {
    window.location.href = "watchlist.html"
  })
  document.getElementById("historyNavBtn").addEventListener("click", () => {
    window.location.href = "watchlist.html?mode=history"
  })

  loadProfile()
}

init()
