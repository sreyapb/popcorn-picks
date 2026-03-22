const API_BASE = "https://<your-railway-url>" // replace with your Railway backend URL

async function login() {
  const email = document.getElementById("email").value.trim()
  const password = document.getElementById("password").value
  const message = document.getElementById("message")

  message.classList.remove("hidden")

  if (!email || !password) {
    message.textContent = "Please enter email and password."
    return
  }

  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })

  const data = await res.json()

  if (!res.ok) {
    message.textContent = data.message || "Login failed"
    return
  }

  localStorage.setItem("token", data.token)
  localStorage.setItem("username", data.username)
  window.location.href = "home.html"
}
