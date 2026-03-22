function ensureAuth() {
  const token = localStorage.getItem("token")
  if (!token) {
    window.location.href = "login.html"
  }
}

async function fetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options)
    if (!res.ok) throw new Error(`Request failed: ${res.status}`)
    return res.json()
  } catch (err) {
    console.error("Fetch error", err)
    return null
  }
}

async function loadGenres() {
  const select = document.getElementById("genreFilter")
  select.innerHTML = "<option value=''>All genres</option>"

  const genres = [
    { id: "28", name: "Action" },
    { id: "35", name: "Comedy" },
    { id: "27", name: "Horror" },
    { id: "10749", name: "Romance" },
    { id: "53", name: "Thriller" }
  ]

  genres.forEach((genre) => {
    const opt = document.createElement("option")
    opt.value = genre.id
    opt.textContent = genre.name
    select.appendChild(opt)
  })
}

async function loadLanguages() {
  const select = document.getElementById("languageFilter")
  select.innerHTML = "<option value=''>All languages</option>"

  const languages = [
    { iso_639_1: "en", english_name: "English" },
    { iso_639_1: "hi", english_name: "Hindi" },
    { iso_639_1: "ml", english_name: "Malayalam" },
    { iso_639_1: "ta", english_name: "Tamil" },
    { iso_639_1: "te", english_name: "Telugu" }
  ]

  languages.forEach((lang) => {
    const opt = document.createElement("option")
    opt.value = lang.iso_639_1
    opt.textContent = `${lang.english_name} (${lang.iso_639_1})`
    select.appendChild(opt)
  })
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}

function buildMovieCard(movie) {
  const rating = movie.average_rating || movie.vote_average
  const div = document.createElement("div")
  div.className = "card"
  div.innerHTML = `
    <img src="https://image.tmdb.org/t/p/w300${movie.poster_path || movie.backdrop_path}" alt="${movie.title}" />
    <div class="card-body">
      <h3>${movie.title}</h3>
      <p>⭐ ${rating ? rating.toFixed(1) : "N/A"} · ${movie.release_date?.slice(0, 4) || ""}</p>
    </div>
  `
  div.addEventListener("click", () => {
    window.location.href = `movie.html?id=${movie.id}`
  })
  return div
}

function showStatus(message) {
  const status = document.getElementById("status")
  status.textContent = message
  status.classList.remove("hidden")
}

function clearStatus() {
  const status = document.getElementById("status")
  status.textContent = ""
  status.classList.add("hidden")
}

function renderGrid(containerId, movies, {limit = 10, random = false, append = false} = {}) {
  const container = document.getElementById(containerId)
  
  if (!append) {
    container.innerHTML = ""
  }

  if (!movies || movies.length === 0) {
    if (!append) {
      container.innerHTML = "<p class='message'>No movies found.</p>"
    }
    return
  }

  let grid = append ? container.querySelector(".grid") : null
  if (!grid) {
    const items = random ? [...movies] : movies
    if (random) shuffleArray(items)
    randomState.allMovies = items
    randomState.displayed = 0
    
    grid = document.createElement("div")
    grid.className = "grid"
    container.appendChild(grid)
  }

  const startIdx = randomState.displayed
  const endIdx = Math.min(randomState.allMovies.length, startIdx + limit)
  const batch = randomState.allMovies.slice(startIdx, endIdx)
  
  batch.forEach((movie) => {
    grid.appendChild(buildMovieCard(movie))
  })

  randomState.displayed = endIdx
  updateLoadMoreButton()
}

const randomState = {
  allMovies: [],
  displayed: 0
}

function updateLoadMoreButton() {
  const btn = document.getElementById("loadMoreBtn")
  if (randomState.displayed < randomState.allMovies.length) {
    btn.classList.remove("hidden")
  } else {
    btn.classList.add("hidden")
  }
}

const FALLBACK_MOVIES = [
  {
    id: 550,
    title: "Fight Club",
    vote_average: 8.4,
    release_date: "1999-10-15",
    poster_path: "/bptfVGEQuv6vDTIMVCHjJ9Dz8PX.jpg"
  },
  {
    id: 278,
    title: "The Shawshank Redemption",
    vote_average: 8.7,
    release_date: "1994-09-23",
    poster_path: "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg"
  },
  {
    id: 238,
    title: "The Godfather",
    vote_average: 8.7,
    release_date: "1972-03-14",
    poster_path: "/rPdtLWNsZmAtoZl9PK7S2wE3qiS.jpg"
  }
]

async function loadTop10Trending() {
  clearStatus()
  const res = await fetchJson("/api/tmdb/trending?page=1")
  if (!res || !res.results) {
    showStatus("Unable to fetch Top 10. Showing fallback movies.")
    renderGrid("top10Movies", FALLBACK_MOVIES, {limit: 10, random: false})
    return
  }

  renderGrid("top10Movies", res.results.slice(0, 10), {limit: 10, random: false})
}

async function loadRandomMovies() {
  clearStatus()

  const page = Math.floor(Math.random() * 5) + 1
  const res = await fetchJson(`/api/tmdb/trending?page=${page}`)

  if (!res || !res.results) {
    showStatus("Unable to fetch random movies. Showing fallback movies.")
    const fallback = [...FALLBACK_MOVIES]
    shuffleArray(fallback)
    randomState.allMovies = fallback
    renderGrid("randomMovies", fallback, {limit: 10, random: false})
    return
  }

  randomState.allMovies = res.results
  renderGrid("randomMovies", res.results, {limit: 10, random: true})
}

async function searchMovie() {
  const query = document.getElementById("search").value.trim()
  const genre = document.getElementById("genreFilter").value
  const language = document.getElementById("languageFilter").value

  if (!query && !genre && !language) {
    return loadRandomMovies()
  }

  clearStatus()

  const params = new URLSearchParams()
  if (query) params.set("query", query)
  if (genre) params.set("with_genres", genre)
  if (language) params.set("with_original_language", language)
  params.set("page", "1")

  const url = query ? "/api/tmdb/search" : "/api/tmdb/discover"
  const res = await fetchJson(`${url}?${params}`)

  if (!res || !res.results) {
    showStatus("No results found. Try a different search or filter.")
    randomState.allMovies = []
    randomState.displayed = 0
    renderGrid("randomMovies", [], {limit: 10})
    updateLoadMoreButton()
    return
  }

  randomState.allMovies = res.results
  randomState.displayed = 0
  const container = document.getElementById("randomMovies")
  container.innerHTML = ""
  renderGrid("randomMovies", res.results, {limit: 10, random: false})
}

function loadMoreMovies() {
  if (randomState.displayed >= randomState.allMovies.length) {
    return
  }
  renderGrid("randomMovies", randomState.allMovies, {limit: 10, append: true})
}

function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("username")
  window.location.href = "login.html"
}

function setProfileInfo({ username, profilePic }) {
  const nameEl = document.getElementById("profileName")
  const avatarEl = document.getElementById("profileAvatar")
  if (username) {
    nameEl.textContent = username
    localStorage.setItem("username", username)
  }

  avatarEl.style.backgroundImage = ""
  avatarEl.style.backgroundColor = "#000"
  avatarEl.textContent = (username || "?")[0].toUpperCase()
}

function toggleProfileDropdown() {
  const dropdown = document.getElementById("profileDropdown")
  dropdown.classList.toggle("hidden")
}

function closeProfileDropdown() {
  const dropdown = document.getElementById("profileDropdown")
  dropdown.classList.add("hidden")
}

async function loadProfile() {
  const token = localStorage.getItem("token")
  if (!token) return

  const profile = await fetchJson("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (profile && profile.username) {
    setProfileInfo(profile)
  } else {
    // Fallback to local storage username
    const username = localStorage.getItem("username")
    if (username) setProfileInfo({ username })
  }
}

function init() {
  try {
    ensureAuth()

    document.getElementById("search").addEventListener("keydown", (event) => {
      if (event.key === "Enter") searchMovie()
    })

    document.getElementById("genreFilter").addEventListener("change", searchMovie)
    document.getElementById("languageFilter").addEventListener("change", searchMovie)
    document.getElementById("loadMoreBtn").addEventListener("click", loadMoreMovies)

    // Profile dropdown
    document.getElementById("profileBtn").addEventListener("click", (event) => {
      event.stopPropagation()
      toggleProfileDropdown()
    })
    document.getElementById("profileDropdown").addEventListener("click", (event) => {
      event.stopPropagation()
    })
    document.addEventListener("click", () => {
      closeProfileDropdown()
    })

    document.getElementById("editProfileBtn").addEventListener("click", () => {
      window.location.href = "profile.html"
    })
    document.getElementById("watchlistBtn").addEventListener("click", () => {
      window.location.href = "watchlist.html"
    })
    document.getElementById("historyBtn").addEventListener("click", () => {
      window.location.href = "watchlist.html?mode=history"
    })
    document.getElementById("logoutBtn").addEventListener("click", logout)

    loadProfile()
    loadGenres()
    loadLanguages()
    loadTop10Trending()
    loadRandomMovies()
  } catch (err) {
    console.error("Home init error", err)
    showStatus("There was a problem loading the page. Open the console for details.")
  }
}

init()
