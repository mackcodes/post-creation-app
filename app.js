require('dotenv').config();
const express = require('express');
const app = express();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const cookieParser = require('cookie-parser');

const userModel = require('./models/user')
const postModel = require('./models/post');

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "3d";
const COOKIE_NAME = process.env.COOKIE_NAME || "token";
const COOKIE_MAX_AGE_MS = Number(process.env.COOKIE_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 3);
const IS_PRODUCTION = process.env.NODE_ENV === "production";

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set in environment variables");
}

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
    res.render("register", { error: null, formData: {}, fieldErrors: {} })
})

app.post("/register", async (req, res) => {
    let {email, password, age, username, name} = req.body;

    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedUsername = (username || "").trim().toLowerCase();
    const normalizedName = (name || "").trim();
    const normalizedPassword = (password || "").trim();
    const parsedAge = Number(age);
    const formData = {
        name: normalizedName,
        username: normalizedUsername,
        age: age || "",
        email: normalizedEmail
    };

    if (!normalizedName || !normalizedUsername || !normalizedEmail || !normalizedPassword || Number.isNaN(parsedAge)) {
        return res.status(400).render("register", {
            error: "Name, username, age, email and password are required",
            formData,
            fieldErrors: {
                name: !normalizedName,
                username: !normalizedUsername,
                age: Number.isNaN(parsedAge),
                email: !normalizedEmail,
                password: !normalizedPassword
            }
        });
    }

    if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
        return res.status(400).render("register", {
            error: "Age must be a valid number between 1 and 120",
            formData,
            fieldErrors: { age: true }
        });
    }

    if (!isValidEmail(normalizedEmail)) {
        return res.status(400).render("register", {
            error: "Please provide a valid email",
            formData,
            fieldErrors: { email: true }
        });
    }

    if (normalizedPassword.length < 6) {
        return res.status(400).render("register", {
            error: "Password must be at least 6 characters long",
            formData,
            fieldErrors: { password: true }
        });
    }

    let user = await userModel.findOne({
        $or: [
            { email: normalizedEmail },
            { username: normalizedUsername }
        ]
    });
    if (user) {
        const duplicateFieldErrors = {
            email: user.email === normalizedEmail,
            username: user.username === normalizedUsername
        };

        if (!duplicateFieldErrors.email && !duplicateFieldErrors.username) {
            duplicateFieldErrors.email = true;
            duplicateFieldErrors.username = true;
        }

        return res.status(409).render("register", {
            error: "Username or email already exists",
            formData,
            fieldErrors: duplicateFieldErrors
        });
    }

    bcrypt.genSalt(10, (err, salt) => {
        if (err) {
            return res.status(500).render("register", {
                error: "Something went wrong. Please try again.",
                formData,
                fieldErrors: {}
            });
        }

        bcrypt.hash(normalizedPassword, salt, async (err, hash) => {
            if (err) {
                return res.status(500).render("register", {
                    error: "Something went wrong. Please try again.",
                    formData,
                    fieldErrors: {}
                });
            }

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
                    const duplicateFieldErrors = {
                        email: Boolean(error?.keyPattern?.email),
                        username: Boolean(error?.keyPattern?.username)
                    };

                    if (!duplicateFieldErrors.email && !duplicateFieldErrors.username) {
                        duplicateFieldErrors.email = true;
                        duplicateFieldErrors.username = true;
                    }

                    return res.status(409).render("register", {
                        error: "Username or email already exists",
                        formData,
                        fieldErrors: duplicateFieldErrors
                    });
                }

                return res.status(500).render("register", {
                    error: "Something went wrong. Please try again.",
                    formData,
                    fieldErrors: {}
                });
            }

            let token = jwt.sign({email: normalizedEmail, userid: user._id}, JWT_SECRET, {expiresIn: JWT_EXPIRES_IN});
            res.cookie(COOKIE_NAME, token, {
                httpOnly: true,
                secure: IS_PRODUCTION,
                sameSite: "strict",
                maxAge: COOKIE_MAX_AGE_MS
            })
            res.redirect("/profile");
        })
    })
})

app.get("/login", (req, res) => {
    res.render("login", { error: null, identifier: "", fieldErrors: {} })
})

app.post("/login", async (req, res) => {
    let {identifier, password} = req.body;

    const normalizedIdentifier = (identifier || "").trim().toLowerCase();
    const normalizedPassword = (password || "").trim();

    if (!normalizedIdentifier || !normalizedPassword) {
        return res.status(400).render("login", {
            error: "Email/username and password are required",
            identifier: normalizedIdentifier,
            fieldErrors: {
                identifier: !normalizedIdentifier,
                password: !normalizedPassword
            }
        });
    }

    if (normalizedIdentifier.includes("@") && !isValidEmail(normalizedIdentifier)) {
        return res.status(400).render("login", {
            error: "Please provide a valid email",
            identifier: normalizedIdentifier,
            fieldErrors: { identifier: true }
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
            identifier: normalizedIdentifier,
            fieldErrors: { identifier: true, password: true }
        });
    }

    const match = await bcrypt.compare(normalizedPassword, user.password);
    if(!match) {
        return res.status(401).render("login", {
            error: "Invalid email/username or password",
            identifier: normalizedIdentifier,
            fieldErrors: { identifier: true, password: true }
        });
    }

    let token = jwt.sign({email: user.email, userid: user._id}, JWT_SECRET, {expiresIn: JWT_EXPIRES_IN});
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "strict",
        secure: IS_PRODUCTION,
        maxAge: COOKIE_MAX_AGE_MS
    });


    res.redirect("/profile");
});

app.get("/logout", (req, res) => {
    res.clearCookie(COOKIE_NAME);  //res.cookie("token", "") --> wrong approach
    res.redirect("login");
})

function isLoggedIn(req, res, next){
    if(!req.cookies[COOKIE_NAME]) return res.redirect("/login");

    try{
        let data = jwt.verify(req.cookies[COOKIE_NAME], JWT_SECRET); // verifies token is valid and not expired
        req.user = data;  //attach user data to request for next route
        next();
    } catch(err){  // --> if token expired or tampered => clear cookies and redirect
        res.clearCookie(COOKIE_NAME);
        res.redirect("/login");
    }
}

app.post("/post", isLoggedIn, async (req, res) => {
    const content = (req.body.content || "").trim();

    if (!content) {
        return res.redirect("/profile");
    }

    // One-way reference: the post keeps ownership via user id; this avoids
    // duplicating post ids inside user documents.
    let post = await postModel.create({
        content,
        user: req.user.userid
    });
    res.redirect("/profile");
});

app.post("/post/edit/:id", isLoggedIn, async (req, res) => {
    const content = (req.body.content || "").trim();

    if (!content) {
        return res.status(400).json({ success: false, message: "Content is required" });
    }

    try {
        const post = await postModel.findOneAndUpdate(
            { _id: req.params.id, user: req.user.userid },
            { content },
            { new: true }
        );

        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update post" });
    }
});


app.listen(PORT);
