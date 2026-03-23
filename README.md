# Post Creation App

A Node.js + Express + MongoDB app with EJS views for user authentication and post creation/editing.

## Features

- User registration with validation
- Login using email or username
- JWT auth with HTTP-only cookie
- Protected profile page
- Create posts (content is trimmed before save)
- Edit your own posts (`/post/edit/:id`)
- Post feed with date + 24-hour time display
- Input-level error feedback on login/register forms

## Tech Stack

- Node.js (CommonJS)
- Express
- MongoDB + Mongoose
- EJS templating
- JWT (`jsonwebtoken`)
- Password hashing (`bcrypt`)
- Tailwind CSS (via PostCSS)

## Project Structure

- `app.js`: main server, routes, auth middleware
- `models/user.js`: user schema/model
- `models/post.js`: post schema/model
- `views/`: EJS templates (`login`, `register`, `profile`)
- `public/stylesheets/`: generated and source CSS

## Clone The Repository

```bash
git clone git@github.com:mackcodes/post-creation-app.git
cd post-creation-app
```

If you prefer HTTPS:

```bash
git clone https://github.com/mackcodes/post-creation-app.git
cd post-creation-app
```

## Environment Variables

1. Copy the example file:

```bash
cp .env.example .env
```

2. Update values in `.env` as needed:

```env
NODE_ENV=development
PORT=3000

MONGODB_URI=mongodb://127.0.0.1:27017/postApp

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=3d

COOKIE_NAME=token
COOKIE_MAX_AGE_MS=259200000
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create your local environment file:

```bash
cp .env.example .env
```

3. Ensure MongoDB is running locally on:

- `mongodb://127.0.0.1:27017/postApp`

4. Start CSS watcher (optional, for style changes):

```bash
npm run dev
```

5. Start the server:

```bash
node app.js
```

App runs on: `http://localhost:3000`

## Typical Workflow

Open two terminals:

- Terminal 1 (styles):

```bash
npm run dev
```

- Terminal 2 (server):

```bash
node app.js
```

## Auth Flow

- On successful register/login, server sets a JWT cookie named `token`
- Protected routes use `isLoggedIn` middleware
- If token is invalid/expired, cookie is cleared and user is redirected to login

## Data Model

### User

- `username` (unique, lowercase)
- `name`
- `age`
- `email` (unique, lowercase)
- `password` (bcrypt hash)

### Post

- `user` (ObjectId ref to `user`)
- `date` (defaults to `Date.now`)
- `content`
- `likes` (array of user ObjectIds)

## Referencing Strategy

This project currently uses **one-way referencing** for posts:

- `post.user` stores owner id
- user documents do not store post id arrays

This keeps writes simpler and avoids sync bugs between two collections.

## Main Routes

- `GET /` - health/welcome response
- `GET /register` - register page
- `POST /register` - create account
- `GET /login` - login page
- `POST /login` - authenticate user
- `GET /profile` - protected profile + post feed
- `POST /post` - create post (protected)
- `POST /post/edit/:id` - edit own post (protected)
- `GET /logout` - clear token cookie

## Notes

- Existing user-facing form output is rendered with escaped EJS output tags (`<%=`).
- Ensure you keep auth checks on protected routes (`/profile`, `/post`, `/post/edit/:id`).
