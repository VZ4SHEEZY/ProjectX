# CyberDope Backend

A full-featured Node.js/Express backend for the CyberDope cyberpunk social media platform.

## Features

- **Authentication**: JWT-based auth with registration, login, and age verification
- **User Management**: Profiles, following system, creator subscriptions
- **Content**: Posts (text, image, video, audio, live), comments, likes
- **Monetization**: Tips, subscriptions, pay-per-view content
- **Real-time**: Socket.io for chat, notifications, and live streaming
- **Search**: Full-text search for users and posts
- **File Uploads**: Support for images, videos, and audio

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.io
- **Auth**: JWT (jsonwebtoken)
- **Security**: bcryptjs, helmet, express-rate-limit
- **File Uploads**: Multer

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start MongoDB

Make sure MongoDB is running locally or provide a MongoDB Atlas URI in `.env`.

### 4. Seed the Database (Optional)

```bash
npm run seed
```

This creates demo users, posts, comments, and interactions.

### 5. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/verify-age` - Verify age for NSFW content

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:username` - Get user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/:id/follow` - Follow/unfollow user
- `GET /api/users/:id/followers` - Get followers
- `GET /api/users/:id/following` - Get following

### Posts
- `GET /api/posts` - Get all posts
- `GET /api/posts/foryou` - Personalized feed
- `GET /api/posts/following` - Following feed
- `GET /api/posts/trending` - Trending posts
- `POST /api/posts` - Create post
- `GET /api/posts/:id` - Get single post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post

### Comments
- `GET /api/posts/:postId/comments` - Get comments
- `POST /api/posts/:postId/comments` - Add comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment
- `POST /api/comments/:id/like` - Like comment

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read

### Messages
- `GET /api/messages/conversations` - Get conversations
- `GET /api/messages/:userId` - Get messages with user
- `POST /api/messages/:userId` - Send message

### Tips & Subscriptions
- `POST /api/tips` - Send tip
- `GET /api/tips/sent` - Get sent tips
- `GET /api/tips/received` - Get received tips
- `POST /api/tips/subscriptions` - Subscribe to creator
- `GET /api/tips/subscriptions` - Get subscriptions
- `POST /api/tips/purchases` - Purchase PPV content

### Search
- `GET /api/search?q=query` - Search users and posts
- `GET /api/search/trending` - Trending searches
- `GET /api/search/suggestions` - Search suggestions

### Upload
- `POST /api/upload/image` - Upload image
- `POST /api/upload/video` - Upload video
- `POST /api/upload/audio` - Upload audio
- `POST /api/upload/avatar` - Upload avatar
- `POST /api/upload/banner` - Upload banner

## WebSocket Events

Connect to `ws://localhost:5000` for real-time features:

### Client → Server
- `join` - Join with userId
- `join-room` - Join a room (post/stream)
- `new-comment` - New comment on post
- `new-message` - New direct message
- `typing` - Typing indicator
- `stream-start` - Start live stream
- `stream-end` - End live stream
- `stream-message` - Message in stream

### Server → Client
- `comment` - New comment notification
- `message` - New message
- `user-typing` - Typing indicator
- `stream-started` - Stream started
- `stream-ended` - Stream ended
- `stream-message` - Stream chat message
- `notification` - General notification

## Demo Credentials

After seeding, you can log in with:

- **Email**: neon@cyberdope.io
- **Password**: password123

Or any of the other demo accounts with the same password.

## Project Structure

```
backend/
├── models/           # Mongoose models
│   ├── User.js
│   ├── Post.js
│   ├── Comment.js
│   ├── Notification.js
│   ├── Message.js
│   └── Tip.js
├── routes/           # API routes
│   ├── auth.js
│   ├── users.js
│   ├── posts.js
│   ├── comments.js
│   ├── notifications.js
│   ├── messages.js
│   ├── tips.js
│   ├── search.js
│   └── upload.js
├── middleware/       # Express middleware
│   └── auth.js
├── uploads/          # Uploaded files
├── server.js         # Main server file
├── seed.js           # Database seeder
└── package.json
```

## License

MIT
