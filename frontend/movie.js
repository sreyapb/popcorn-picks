const params = new URLSearchParams(window.location.search)
const movieId = params.get("id")

async function loadMovie() {
  const res = await fetch(`/api/tmdb/movie/${movieId}`)
  const movie = await res.json()

  document.getElementById("movieDetails").innerHTML = `
    <h1>${movie.title}</h1>
    <img src="https://image.tmdb.org/t/p/w300${movie.poster_path}">
    <p>${movie.overview}</p>
  `

  const average = movie.average_rating || movie.vote_average
  document.getElementById("ratings").innerHTML = `
    TMDB ⭐ ${movie.vote_average}
    OMDB ⭐ ${movie.ratings?.omdb?.find(r => r.Source === 'Internet Movie Database')?.Value || 'N/A'}
    XMDb ⭐ ${movie.ratings?.xmdb || 'N/A'}
    Average ⭐ ${average.toFixed(1)}
  `
}

loadMovie()

}

loadMovie()