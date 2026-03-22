async function addWatchlist(){

const token=localStorage.getItem("token")

await fetch("http://localhost:5000/watchlist",{

method:"POST",
headers:{
"Content-Type":"application/json",
"Authorization":token
},

body:JSON.stringify({movieId})

})

alert("Added to watchlist")

}
