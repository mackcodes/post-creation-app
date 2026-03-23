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
    password: String,
    posts: [
        {type: mongoose.Schema.Types.ObjectId, ref: "post"}
    ]
});

module.exports = mongoose.model('user', userSchema);