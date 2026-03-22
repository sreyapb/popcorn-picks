const token = localStorage.getItem("token")

const urlParams = new URLSearchParams(window.location.search)
const showHistory = urlParams.get("mode") === "history"

function requireAuth() {
  if (!token) {
    window.location.href = "login.html"
  }
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Request failed: ${res.status} — ${body}`)
  }
  return res.json()
}

async function loadWatchlist() {
  try {
    const list = await fetchJson("http://localhost:3000/api/watchlist", {
      headers: { Authorization: `Bearer ${token}` }
    })

    const heroTitle = document.querySelector(".hero h2")
    const heroDesc = document.querySelector(".hero p")
    if (showHistory) {
      heroTitle.textContent = "Your watch history"
      heroDesc.textContent = "Movies you've marked as watched." 
    } else {
      heroTitle.textContent = "Your watchlist"
      heroDesc.textContent = "Keep track of the movies you plan to watch next."
    }

    const container = document.getElementById("watchlist")
    container.innerHTML = ""

    const filtered = showHistory ? list.filter((m) => m.watched) : list

    if (!filtered || filtered.length === 0) {
      container.innerHTML = showHistory
        ? "<p class='message'>No watched movies yet.</p>"
        : "<p class='message'>Your watchlist is empty.</p>"
      return
    }

    const grid = document.createElement("div")
    grid.className = "grid"

    filtered.forEach((movie) => {
      const card = document.createElement("div")
      card.className = `card ${movie.watched ? "watched" : ""}`
      const watchedText = movie.watched ? "✓ Watched" : "Mark as Watched"
      const watchedClass = movie.watched ? "secondary watched" : "secondary"
      
      card.innerHTML = `
        <img src="https://image.tmdb.org/t/p/w300${movie.poster}" />
        <div class="card-body">
          <h3>${movie.title}</h3>
          <button class="${watchedClass} watched-btn" data-id="${movie.tmdbId}">${watchedText}</button>
          <button class="primary" data-id="${movie.tmdbId}">Remove</button>
        </div>
      `
      card.querySelector("img").addEventListener("click", () => {
        window.location.href = `movie.html?id=${movie.tmdbId}`
      })

      // Mark as watched button
      card.querySelector(".watched-btn").addEventListener("click", async () => {
        await toggleWatched(movie.tmdbId)
      })

      // Remove button
      const buttons = card.querySelectorAll("button")
      buttons[1].addEventListener("click", async () => {
        await removeMovie(movie.tmdbId)
      })

      grid.appendChild(card)
    })

    container.appendChild(grid)
  } catch (err) {
    document.getElementById("watchlist").innerHTML =
      "<p class='message'>Unable to load watchlist.</p>"
  }
}

async function toggleWatched(tmdbId) {
  try {
    const response = await fetchJson(
      `http://localhost:3000/api/watchlist/watched/${tmdbId}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    loadWatchlist()
  } catch {
    alert("Failed to update movie status.")
  }
}

async function removeMovie(tmdbId) {
  try {
    await fetchJson(`http://localhost:3000/api/watchlist/remove/${tmdbId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
    loadWatchlist()
  } catch {
    alert("Failed to remove movie from watchlist.")
  }
}

function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("username")
  window.location.href = "login.html"
}

function init() {
  requireAuth()

  if (showHistory) {
    const nav = document.querySelector("header nav")
    const backBtn = document.createElement("button")
    backBtn.textContent = "Full watchlist"
    backBtn.addEventListener("click", () => {
      window.location.href = "watchlist.html"
    })
    nav.insertBefore(backBtn, nav.firstChild)
  }

  document.getElementById("logoutBtn").addEventListener("click", logout)
  loadWatchlist()
}

init()
