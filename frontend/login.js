async function login() {
  const email = document.getElementById("email").value.trim()
  const password = document.getElementById("password").value
  const message = document.getElementById("message")

  message.classList.remove("hidden")

  if (!email || !password) {
    message.textContent = "Please enter email and password."
    return
  }

  const res = await fetch("http://localhost:3000/api/auth/login", {
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