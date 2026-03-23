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

## Environment Variables

Create a `.env` file in the project root:

```env
JWT_SECRET=your-strong-secret
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Ensure MongoDB is running locally on:

- `mongodb://127.0.0.1:27017/postApp`

3. Start CSS watcher (optional, for style changes):

```bash
npm run dev
```

4. Start the server:

```bash
node app.js
```

App runs on: `http://localhost:3000`

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
