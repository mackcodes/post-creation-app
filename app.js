require('dotenv').config();
const express = require('express');
const app = express();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const cookieParser = require('cookie-parser');

const userModel = require('./models/user')
const postModel = require('./models/post');

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

app.get("/", (req, res) => {
    res.send("Hiiiiiiii")
});

app.get("/profile", isLoggedIn, async (req, res) => {
    
    let user = await userModel.findOne({email: req.user.email});
    let posts = await postModel.find({user: req.user.userid});
    
    if(!user) return res.status(404).send("User not found");
    res.render("profile", {user, posts});
});

app.get("/register", (req, res) => {
    res.render("register")
})

app.post("/register", async (req, res) => {
    let {email, password, age, username, name} = req.body;

    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedUsername = (username || "").trim().toLowerCase();
    const normalizedName = (name || "").trim();
    const normalizedPassword = (password || "").trim();
    const parsedAge = Number(age);

    if (!normalizedName || !normalizedUsername || !normalizedEmail || !normalizedPassword || Number.isNaN(parsedAge)) {
        return res.status(400).send("Name, username, age, email and password are required");
    }

    if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
        return res.status(400).send("Age must be a valid number between 1 and 120");
    }

    if (!isValidEmail(normalizedEmail)) {
        return res.status(400).send("Please provide a valid email");
    }

    if (normalizedPassword.length < 6) {
        return res.status(400).send("Password must be at least 6 characters long");
    }

    let user = await userModel.findOne({email: normalizedEmail});
    if (user) return res.status(409).send("User already registered");

    bcrypt.genSalt(10, (err, salt) => {
        if (err) return res.status(500).send("Error while generating password salt");

        bcrypt.hash(password, salt, async (err, hash) => {
            if (err) return res.status(500).send("Error while hashing password");

            let user;
            try {
                user = await userModel.create({
                    username: normalizedUsername,
                    email: normalizedEmail,
                    age: parsedAge,
                    name: normalizedName,
                    password: hash
                });
            } catch (error) {
                if (error?.code === 11000) {
                    return res.status(409).send("Username or email already exists");
                }

                return res.status(500).send("Error while creating user");
            }

            let token = jwt.sign({email: normalizedEmail, userid: user._id}, process.env.JWT_SECRET, {expiresIn: "3d"});
            res.cookie("token", token, {
                httpOnly: true,
                // secure: true,   --> it will not work in local host(development use)
                sameSite: "strict",
                /* Because `maxAge` is in milliseconds**, so we have to convert: 
                    1000        = 1 second      (milliseconds in 1 second)
                    1000 * 60   = 1 minute      (60 seconds in 1 minute)
                    1000 * 60 * 60    = 1 hour  (60 minutes in 1 hour)
                    1000 * 60 * 60 * 24 = 1 day (24 hours in 1 day)
                */
                maxAge: 1000 * 60 * 60 * 24 * 3 // for three days
            })
            res.redirect("/profile");
        })
    })
})

app.get("/login", (req, res) => {
    res.render("login", { error: null, identifier: "" })
})

app.post("/login", async (req, res) => {
    let {identifier, password} = req.body;

    const normalizedIdentifier = (identifier || "").trim().toLowerCase();
    const normalizedPassword = (password || "").trim();

    if (!normalizedIdentifier || !normalizedPassword) {
        return res.status(400).render("login", {
            error: "Email/username and password are required",
            identifier: normalizedIdentifier
        });
    }

    if (normalizedIdentifier.includes("@") && !isValidEmail(normalizedIdentifier)) {
        return res.status(400).render("login", {
            error: "Please provide a valid email",
            identifier: normalizedIdentifier
        });
    }

    let user = await userModel.findOne({
        $or: [  // $or --> in Mongo this means any one of is true in this case either email or username
            { email: normalizedIdentifier },
            { username: normalizedIdentifier }
        ]
    })
    if(!user) {
        return res.status(401).render("login", {
            error: "Invalid email/username or password",
            identifier: normalizedIdentifier
        });
    }

    const match = await bcrypt.compare(normalizedPassword, user.password);
    if(!match) {
        return res.status(401).render("login", {
            error: "Invalid email/username or password",
            identifier: normalizedIdentifier
        });
    }

    let token = jwt.sign({email: user.email, userid: user._id}, process.env.JWT_SECRET, {expiresIn: "3d"});
    res.cookie("token", token, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24 * 3
    });


    res.redirect("/profile");
});

app.get("/logout", (req, res) => {
    res.clearCookie("token");  //res.cookie("token", "") --> wrong approach
    res.redirect("login");
})

function isLoggedIn(req, res, next){
    if(!req.cookies.token) return res.redirect("/login");

    try{
        let data = jwt.verify(req.cookies.token, process.env.JWT_SECRET); // verifies token is valid and not expired
        req.user = data;  //attach user data to request for next route
        next();
    } catch(err){  // --> if token expired or tampered => clear cookies and redirect
        res.clearCookie("token");
        res.redirect("/login");
    }
}

app.post("/post/create", isLoggedIn, async (req, res) => {
    let post = await postModel.create({
        content: req.body.content,
        user: req.user.userid
    });
    res.redirect("/profile");
});


app.listen(3000);
