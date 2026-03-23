const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in environment variables");
}

mongoose.connect(MONGODB_URI);

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
        lowercase: true
    },
    name: String,
    age: Number,
    email: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
        lowercase: true
    },
    password: String
    // One-way reference model: posts store the user id, so we do not duplicate
    // post ids on the user document.
});

module.exports = mongoose.model('user', userSchema);