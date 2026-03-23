const mongoose = require('mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/postApp");

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