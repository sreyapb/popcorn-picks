const mongoose = require("mongoose")

const ReviewSchema = new mongoose.Schema({

tmdbId: Number,

userId: {
type: mongoose.Schema.Types.ObjectId,
ref: "User"
},

username: String,

rating: Number,

reviewText: String,

createdAt: {
type: Date,
default: Date.now
}

})

module.exports = mongoose.model("Review", ReviewSchema)