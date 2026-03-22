const params = new URLSearchParams(window.location.search)
const movieId = params.get("id")

const token = localStorage.getItem("token")
console.log("🔍 Token loaded:", token ? "✅ Present" : "❌ Missing")
console.log("🎬 Movie ID from URL:", movieId)

let trailerKey = null
let tmdbReviews = []
let omdbData = null
let xmdbData = null
let userReviews = []
let selectedRating = 0

function requireAuth() {
  if (!token) {
    window.location.href = "login.html"
  }
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const body = await res.text()
    console.error(`❌ API Error - ${res.status}:`, body)
    throw new Error(`API Error ${res.status}: ${body.substring(0, 100)}`)
  }
  return res.json()
}

function setProfileInfo({ username }) {
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

function toggleProfileDropdown() {
  const dropdown = document.getElementById("profileDropdown")
  if (dropdown) dropdown.classList.toggle("hidden")
}

function closeProfileDropdown() {
  const dropdown = document.getElementById("profileDropdown")
  if (dropdown) dropdown.classList.add("hidden")
}

async function loadProfile() {
  const token = localStorage.getItem("token")
  if (!token) return

  try {
    const profile = await fetchJson("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (profile && profile.username) {
      setProfileInfo(profile)
    } else {
      const username = localStorage.getItem("username")
      if (username) setProfileInfo({ username })
    }
  } catch (err) {
    const username = localStorage.getItem("username")
    if (username) setProfileInfo({ username })
  }
}

let currentMovie = null
let inWatchlist = false

function generateStars(rating) {
  const maxStars = 5
  const starsValue = rating / 2 // Convert 10-point scale to 5-star scale
  const fullStars = Math.floor(starsValue)
  const halfStar = (starsValue % 1) >= 0.5 ? 1 : 0
  const emptyStars = maxStars - fullStars - halfStar

  return '★'.repeat(fullStars) + '☆'.repeat(halfStar) + '☆'.repeat(emptyStars)
}

async function loadMovie() {
  try {
    if (!movieId) {
      document.getElementById("movieDetails").innerHTML = "<p style='color:#ff6b6b; font-size:18px;'>❌ No movie ID provided. Please go back and select a movie.</p>"
      return
    }

    currentMovie = await fetchJson(`/api/tmdb/movie/${movieId}`)
    const movie = currentMovie

    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : "—"
    const genres = movie.genres?.map((g) => g.name).join(", ") || "—"

    document.getElementById("movieDetails").innerHTML = `
      <div class="movie-detail">
        <div class="movie-detail-left">
          <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}" />
        </div>
        <div class="movie-detail-right">
          <h1>${movie.title}</h1>
          <div class="movie-meta">
            <span class="rating">${generateStars(movie.average_rating || movie.vote_average)} ${(movie.average_rating || movie.vote_average)?.toFixed(1) || 'N/A'}</span>
            <span class="meta-separator">•</span>
            <span class="year">${year}</span>
          </div>

          <div class="movie-section">
            <h2>Overview</h2>
            <p>${movie.overview || "No description available."}</p>
          </div>

          <div class="movie-section">
            <h2>Genres</h2>
            <p>${genres}</p>
          </div>

          <div class="movie-section movie-info-row">
            <div>
              <h3>Runtime</h3>
              <p>${movie.runtime ? movie.runtime + " minutes" : "—"}</p>
            </div>
            <div>
              <h3>Budget</h3>
              <p>${movie.budget ? `$${(movie.budget / 1_000_000).toFixed(2)}M` : "—"}</p>
            </div>
            <div>
              <h3>Revenue</h3>
              <p>${movie.revenue ? `$${(movie.revenue / 1_000_000).toFixed(2)}M` : "—"}</p>
            </div>
          </div>

          <div class="movie-section" id="castCrew">
            <h2>Cast & Crew</h2>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    `

    loadRatings(movie)
    loadTrailer(movie)
    loadWatchProviders(movie)
    loadCastCrew(movie)
    loadReviews(movieId)
    checkWatchlist(movie)
    loadSimilarMovies(movieId)
  } catch (err) {
    console.error("Error loading movie:", err)
    document.getElementById("movieDetails").innerHTML = `
      <div style="padding: 40px; text-align: center; color: #ff6b6b;">
        <p style="font-size: 24px; margin-bottom: 10px;">❌ Error Loading Movie</p>
        <p style="font-size: 14px; margin-bottom: 20px;">${err.message}</p>
        <p style="font-size: 12px; color: #888;">Please check your connection and try refreshing the page.</p>
      </div>
    `
  }
}

async function loadTrailer(movie) {
  try {
    const data = await fetchJson(`/api/tmdb/movie/${movieId}/videos`)
    const trailer = data.results.find(
      (v) => v.site === "YouTube" && v.type === "Trailer"
    )
    if (trailer) {
      trailerKey = trailer.key
      document.getElementById("trailerBtn").disabled = false
    } else {
      document.getElementById("trailerBtn").disabled = true
    }
  } catch {
    document.getElementById("trailerBtn").disabled = true
  }
}

async function loadWatchProviders(movie) {
  try {
    const data = await fetchJson(`/api/tmdb/movie/${movieId}/watch/providers`)
    const providers = data.results?.US || {} // Assuming US region, can be made configurable

    const flatrate = providers.flatrate || []
    const rent = providers.rent || []
    const buy = providers.buy || []

    const container = document.getElementById("watchProviders")

    if (flatrate.length === 0 && rent.length === 0 && buy.length === 0) {
      container.innerHTML = "<p class='message'>No streaming information available.</p>"
      return
    }

    const renderProviders = (list, label) => {
      if (list.length === 0) return ""
      return `
        <div class="provider-group">
          <h4>${label}</h4>
          <div class="providers">
            ${list.map(p => `<img src="https://image.tmdb.org/t/p/w45${p.logo_path}" alt="${p.provider_name}" title="${p.provider_name}">`).join("")}
          </div>
        </div>
      `
    }

    container.innerHTML = `
      ${renderProviders(flatrate, "Stream")}
      ${renderProviders(rent, "Rent")}
      ${renderProviders(buy, "Buy")}
    `
  } catch (err) {
    document.getElementById("watchProviders").innerHTML = "<p class='message'>Unable to load watch providers.</p>"
  }
}

function openTrailer() {
  if (!trailerKey) return
  window.open(`https://www.youtube.com/watch?v=${trailerKey}`, "_blank")
}

async function loadRatings(movie) {
  const ratingSection = document.getElementById("ratings")
  ratingSection.innerHTML = "Loading ratings..."

  const tmdbRating = movie.ratings?.tmdb || movie.vote_average
  const omdbRatings = movie.ratings?.omdb || []
  const xmdbRating = movie.ratings?.xmdb

  // store for review filtering
  omdbData = { Ratings: omdbRatings }
  xmdbData = { rating: xmdbRating }

  // TMDB reviews
  try {
    const reviewsData = await fetchJson(`/api/tmdb/movie/${movieId}/reviews`)
    tmdbReviews = reviewsData.results || []
  } catch (err) {
    tmdbReviews = []
  }

  const averageRating = movie.average_rating || tmdbRating

  // Calculate combined OMDB rating
  let omdbCombinedRating = null
  if (omdbRatings.length > 0) {
    const normalizedRatings = omdbRatings.map(r => {
      let val = r.Value
      if (r.Source === "Internet Movie Database") {
        return parseFloat(val)
      } else if (r.Source === "Rotten Tomatoes") {
        return val.endsWith('%') ? parseFloat(val) / 10 : parseFloat(val) / 100
      } else if (r.Source === "Metacritic") {
        return parseFloat(val) / 10
      } else {
        // Try to parse as number, assume /10 if <10, /100 if >10
        const num = parseFloat(val)
        return num > 10 ? num / 10 : num
      }
    }).filter(v => !isNaN(v))
    if (normalizedRatings.length > 0) {
      omdbCombinedRating = normalizedRatings.reduce((a, b) => a + b, 0) / normalizedRatings.length
    }
  }

  ratingSection.innerHTML = `
    <p class="rating"><strong>Average</strong> ${generateStars(averageRating)} <span>${averageRating?.toFixed?.(1) || 'N/A'}</span></p>
    <p class="rating">TMDB ${generateStars(tmdbRating)} <span>${tmdbRating}</span></p>
    ${omdbCombinedRating ? `<p class="rating">OMDB ${generateStars(omdbCombinedRating)} <span>${omdbCombinedRating.toFixed(1)}</span></p>` : ``}
    <p class="rating">XMDB ${xmdbRating ? generateStars(xmdbRating) : '⭐'} <span>${xmdbRating || "N/A"}</span></p>
  `

  filterReviews()
}

async function loadCastCrew(movie) {
  try {
    const data = await fetchJson(`/api/tmdb/movie/${movieId}/credits`)
    const cast = data.cast?.slice(0, 10) || []
    const crew = data.crew?.filter(c => c.job === 'Director' || c.job === 'Writer') || []

    const castHtml = cast.map(actor => `
      <div class="cast-member">
        <img src="${actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://via.placeholder.com/185x278?text=No+Image'}" alt="${actor.name}" />
        <p><strong>${actor.name}</strong></p>
        <p>${actor.character}</p>
      </div>
    `).join('')

    const crewHtml = crew.map(member => `
      <div class="crew-member">
        <p><strong>${member.name}</strong> - ${member.job}</p>
      </div>
    `).join('')

    document.getElementById("castCrew").innerHTML = `
      <h2>Cast</h2>
      <div class="cast-list">${castHtml}</div>
      <h2>Crew</h2>
      <div class="crew-list">${crewHtml}</div>
    `
  } catch (err) {
    document.getElementById("castCrew").innerHTML = "<p>Unable to load cast and crew.</p>"
  }
}

async function loadSimilarMovies(movieId) {
  try {
    const data = await fetchJson(`/api/tmdb/movie/${movieId}/similar`)
    console.log('Similar movies data:', data)

    const container = document.getElementById("similarMovies")
    if (!container) return

    const currentLang = currentMovie?.original_language

    const raw = data.results || []
    const languageMatches = currentLang
      ? raw.filter((movie) => movie.original_language === currentLang)
      : []

    // Use language-matched movies if any.
    // If TMDB doesn't return similar matches in the same language, fall back to a discover search restricted to that language.
    let similar = (languageMatches.length ? languageMatches : []).slice(0, 10)

    if (!similar.length && currentLang) {
      const discoverData = await fetchJson(`/api/tmdb/discover?with_original_language=${currentLang}&sort_by=popularity.desc`)
      similar = (discoverData?.results || []).slice(0, 10)
    }

    if (similar.length === 0) {
      container.innerHTML = "<p class='message'>No similar movies found.</p>"
      return
    }

    const grid = document.createElement("div")
    grid.className = "grid"
    similar.forEach((movie) => {
      const card = document.createElement("div")
      card.className = "card"
      card.innerHTML = `
        <img src="https://image.tmdb.org/t/p/w300${movie.poster_path || movie.backdrop_path}" alt="${movie.title}" />
        <div class="card-body">
          <h3>${movie.title}</h3>
          <p>⭐ ${movie.vote_average?.toFixed(1) || 'N/A'} · ${movie.release_date?.slice(0, 4) || ""} · ${movie.original_language?.toUpperCase() || "??"}</p>
        </div>
      `
      card.addEventListener("click", () => {
        window.location.href = `movie.html?id=${movie.id}`
      })
      grid.appendChild(card)
    })
    container.innerHTML = "" // clear before appending
    container.appendChild(grid)
  } catch (err) {
    console.error('Error loading similar movies:', err)
    const container = document.getElementById("similarMovies")
    if (container) container.innerHTML = "<p>Unable to load similar movies.</p>"
  }
}

async function loadReviews() {
  try {
    const reviews = await fetchJson(`/api/reviews/${movieId}`)
    userReviews = reviews || []
    filterReviews()
  } catch (err) {
    console.error('Error loading user reviews:', err)
    userReviews = []
    filterReviews()
  }
}

function renderReviewList(reviews, title) {
  if (!reviews || reviews.length === 0) {
    return `<p class="message">No ${title} yet.</p>`
  }

  return reviews
    .map((review) => {
      return `
        <div class="card">
          <div class="card-body">
            <h3>${review.author || review.username || "Anonymous"}</h3>
            <p>${review.content || review.reviewText}</p>
            <p class="rating">Rating: <span>${review.rating || "—"}</span></p>
            <p class="muted">${new Date(review.created_at || review.createdAt || review.updatedAt || Date.now()).toLocaleString()}</p>
          </div>
        </div>
      `
    })
    .join("")
}

function filterReviews() {
  const filter = document.getElementById("reviewFilter").value
  const container = document.getElementById("reviews")

  if (filter === "tmdb") {
    container.innerHTML = renderReviewList(tmdbReviews, "TMDB reviews")
    return
  }

  if (filter === "omdb") {
    const entries = (omdbData?.Ratings || []).map((r) => ({
      author: r.Source,
      content: r.Value,
      rating: "",
      created_at: ""
    }))
    container.innerHTML = renderReviewList(entries, "OMDB ratings")
    return
  }

  if (filter === "xmdb") {
    const entries = xmdbData ? [{ author: "XMDB", content: xmdbData.rating, rating: "" }] : []
    container.innerHTML = renderReviewList(entries, "XMDB ratings")
    return
  }

  if (filter === "user") {
    container.innerHTML = renderReviewList(userReviews, "user reviews")
    return
  }

  // all
  const pieces = []
  if (userReviews.length) pieces.push(...userReviews)
  if (tmdbReviews.length) pieces.push(...tmdbReviews)
  if (omdbData?.Ratings) {
    pieces.push(
      ...omdbData.Ratings.map((r) => ({
        author: r.Source,
        content: r.Value,
        rating: "",
        created_at: ""
      }))
    )
  }
  if (xmdbData) {
    pieces.push({ author: "XMDB", content: xmdbData.rating, rating: "", created_at: "" })
  }

  // Shuffle the reviews for random order
  pieces.sort(() => Math.random() - 0.5)

  container.innerHTML = renderReviewList(pieces, "reviews")
}

async function checkWatchlist(movie) {
  try {
    console.log("🔎 Checking watchlist for movie:", movie.id)
    
    const list = await fetchJson("/api/watchlist", {
      headers: { Authorization: `Bearer ${token}` }
    })

    console.log("📋 User watchlist:", list)
    
    const match = list.find((m) => m.tmdbId === movie.id)
    inWatchlist = !!match
    console.log("📍 Movie in watchlist?", inWatchlist)
    updateWatchlistButton()
  } catch (err) {
    console.error("❌ Error checking watchlist:", err)
    inWatchlist = false
    updateWatchlistButton()
  }
}

function updateWatchlistButton() {
  const btn = document.getElementById("watchlistBtn")
  if (!btn) return // Exit if button doesn't exist yet
  
  btn.textContent = inWatchlist ? "Remove from watchlist" : "Add to watchlist"
}

async function addToWatchlist() {
  try {
    if (!currentMovie) throw new Error("Movie not loaded")
    if (!token) throw new Error("Not logged in")

    const payload = {
      tmdbId: Number(currentMovie.id),
      title: currentMovie.title,
      poster: currentMovie.poster_path
    }

    console.log("📤 Sending watchlist request:", {
      url: "/api/watchlist/add",
      payload,
      token: token.substring(0, 20) + "..."
    })

    const response = await fetchJson("/api/watchlist/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })

    console.log("✅ Watchlist response:", response)
    inWatchlist = true
    updateWatchlistButton()
    alert("✅ Added to watchlist!")
  } catch (err) {
    console.error("❌ Error adding to watchlist:", err)
    alert("❌ Unable to add to watchlist. " + err.message)
  }
}

async function removeFromWatchlist() {
  try {
    console.log("Removing from watchlist, movieId:", movieId)
    
    await fetchJson(`/api/watchlist/remove/${movieId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
    
    inWatchlist = false
    updateWatchlistButton()
    alert("✅ Removed from watchlist!")
  } catch (err) {
    console.error("Error removing from watchlist:", err)
    alert("❌ Unable to remove from watchlist. " + err.message)
  }
}

async function submitReview() {
  const name = document.getElementById("reviewName").value.trim()
  const rating = selectedRating
  const reviewText = document.getElementById("reviewText").value.trim()

  if (rating === 0) {
    alert("Please select a rating.")
    return
  }

  if (!reviewText) {
    alert("Please enter a review message.")
    return
  }

  if (!token) {
    alert("You must be logged in to submit a review.")
    return
  }

  console.log("Submitting review:", { movieId, rating, name, token: token ? "present" : "missing" })

  try {
    const result = await fetchJson("/api/reviews/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ tmdbId: Number(movieId), rating, reviewText, name })
    })

    console.log("Review submit result:", result)

    document.getElementById("reviewText").value = ""
    document.getElementById("reviewName").value = ""
    selectedRating = 0
    updateStarDisplay()
    updateRatingLabel()
    await loadReviews()
    alert("✅ Review submitted successfully!")
  } catch (err) {
    console.error("Error submitting review:", err)
    alert("❌ Unable to submit review. " + err.message)
  }
}

function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("username")
  window.location.href = "login.html"
}

function updateRatingLabel() {
  const label = document.getElementById("ratingLabel")
  if (label) label.textContent = `${selectedRating}/5`
}

function updateStarDisplay() {
  const stars = document.querySelectorAll('.star')
  stars.forEach((star, index) => {
    if (index < selectedRating) {
      star.classList.add('selected')
      star.textContent = '★'
    } else {
      star.classList.remove('selected')
      star.textContent = '☆'
    }
  })
}

function init() {
  requireAuth()

  // Profile dropdown
  const profileBtn = document.getElementById("profileBtn")
  if (profileBtn) {
    profileBtn.addEventListener("click", (event) => {
      event.stopPropagation()
      toggleProfileDropdown()
    })
  }

  const profileDropdown = document.getElementById("profileDropdown")
  if (profileDropdown) {
    profileDropdown.addEventListener("click", (event) => {
      event.stopPropagation()
    })
  }

  document.addEventListener("click", () => {
    closeProfileDropdown()
  })

  const editProfileBtn = document.getElementById("editProfileBtn")
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      window.location.href = "profile.html"
    })
  }

  const watchlistNavBtn = document.getElementById("watchlistNavBtn")
  if (watchlistNavBtn) {
    watchlistNavBtn.addEventListener("click", () => {
      window.location.href = "watchlist.html"
    })
  }

  const historyNavBtn = document.getElementById("historyNavBtn")
  if (historyNavBtn) {
    historyNavBtn.addEventListener("click", () => {
      window.location.href = "watchlist.html?mode=history"
    })
  }

  document.getElementById("logoutBtn").addEventListener("click", logout)
  document.getElementById("reviewFilter").addEventListener("change", filterReviews)

  // Star rating event listeners
  const stars = document.querySelectorAll('.star')
  stars.forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.value)
      updateStarDisplay()
      updateRatingLabel()
    })
  })

  updateRatingLabel()
  loadProfile()
  
  // Initialize watchlist button listener
  const watchlistBtn = document.getElementById("watchlistBtn")
  if (watchlistBtn) {
    watchlistBtn.addEventListener("click", (e) => {
      e.preventDefault()
      if (inWatchlist) {
        removeFromWatchlist()
      } else {
        addToWatchlist()
      }
    })
  }
  
  // Load movie with error handling
  loadMovie().catch(err => {
    console.error("Fatal error in loadMovie:", err)
    document.getElementById("movieDetails").innerHTML = `
      <div style="padding: 40px; text-align: center; color: #ff6b6b;">
        <p style="font-size: 24px; margin-bottom: 10px;">❌ Critical Error</p>
        <p style="font-size: 14px;">${err.message}</p>
      </div>
    `
  })
}

init()