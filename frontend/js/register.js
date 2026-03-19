async function register() {
  const username = document.getElementById("username").value.trim()
  const email = document.getElementById("email").value.trim()
  const password = document.getElementById("password").value

  const message = document.getElementById("message")
  message.classList.remove("hidden")

  if (!username || !email || !password) {
    message.textContent = "Please fill in all fields."
    return
  }

  const res = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password })
  })

  const data = await res.json()

  if (!res.ok) {
    message.textContent = data.message || "Unable to register"
    return
  }

  localStorage.setItem("token", data.token)
  localStorage.setItem("username", data.username)
  window.location.href = "home.html"
}
