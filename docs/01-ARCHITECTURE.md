# CyberDope Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Vite)                    │
│                  Vercel: project-x-sage-nine                 │
├─────────────────────────────────────────────────────────────┤
│  App.tsx → Router                                            │
│  ├─ Feed (TikTok-style infinite scroll)                     │
│  ├─ AuthPage (Email/password login)                         │
│  ├─ ExplorePage (Discover creators)                         │
│  ├─ UserProfilePage (Creator profiles)                      │
│  ├─ AdminDashboard (vz4sheezy only)                         │
│  ├─ DMSystem (Messages, vanishing DMs)                      │
│  ├─ WalletConnect (Web3 wallet integration)                 │
│  └─ UploadModal (Post creation)                             │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTPS / JWT Auth
               ↓
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Node.js/Express)                       │
│                  Render: cyberdope-api                       │
├─────────────────────────────────────────────────────────────┤
│  server.js (Port 5000, CORS enabled)                        │
│  ├─ /api/auth           (JWT token generation, login)       │
│  ├─ /api/users          (Profiles, follow, stats)           │
│  ├─ /api/posts          (Feed, create, like, comment)       │
│  ├─ /api/announcements  (Admin broadcasts)                  │
│  ├─ /api/dm             (Messages, conversations)           │
│  ├─ /api/wallet         (Web3 balance queries)              │
│  ├─ /api/upload         (Cloudinary webhook, file refs)     │
│  └─ /health             (Health check endpoint)             │
└──────────────┬──────────────────────────────────────────────┘
               │ Mongoose/MongoDB
               ↓
┌─────────────────────────────────────────────────────────────┐
│           DATABASE (MongoDB Atlas)                           │
│                  Cluster0 (Cloud)                            │
├─────────────────────────────────────────────────────────────┤
│  Collections:                                               │
│  ├─ users        (Auth, profiles, faction, followers)      │
│  ├─ posts        (Content, likes, comments)                │
│  ├─ conversations (DM threads, participants)               │
│  ├─ messages     (Individual messages, expiry)             │
│  ├─ announcements (Admin broadcasts, faction scoped)       │
│  └─ gridfs.files (Video metadata for GridFS)              │
└──────────────┬──────────────────────────────────────────────┘
               │ Cloudinary API v2
               ↓
┌─────────────────────────────────────────────────────────────┐
│           EXTERNAL SERVICES                                  │
├─────────────────────────────────────────────────────────────┤
│  Cloudinary        (Video upload, transcoding, CDN)         │
│  Web3/MetaMask     (Wallet connection, balance queries)     │
│  Vercel            (Frontend deployment, builds)           │
│  Render            (Backend deployment, cold starts ~10s)  │
│  MongoDB Atlas     (Managed database)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Stack
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite (HMR-enabled during dev)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **HTTP Client:** Axios with interceptors
- **Deployment:** Vercel (automatic CI/CD)

### Key Directories
```
app/
├── App.tsx                    # Main router, auth state, user context
├── components/
│   ├── Feed.tsx              # Main TikTok-style infinite scroll
│   ├── AuthPage.tsx          # Login/register forms
│   ├── ExplorePage.tsx       # Creator discovery
│   ├── UserProfilePage.tsx   # Public creator profiles
│   ├── ProfileGrid.tsx       # Profile customization (MySpace-style)
│   ├── ProfileBuilder.tsx    # Drag-drop widget builder
│   ├── AdminDashboard.tsx    # Admin panel (vz4sheezy only)
│   ├── DMSystem.tsx          # Conversation list + message UI
│   ├── WalletConnect.tsx     # Web3 wallet integration
│   ├── UploadModal.tsx       # Post creation interface
│   ├── VideoPlayer.tsx       # Custom playback UI
│   ├── TopFriendsWidget.tsx  # Following list
│   ├── DesktopFeed.tsx       # 65/35 desktop layout
│   ├── VideoModal.tsx        # Modal video player
│   ├── AnnouncementBanner.tsx # Admin announcement display
│   ├── AvatarCropper.tsx     # Square avatar cropper
│   └── ErrorBoundary.tsx     # Error containment (NEW)
├── services/
│   ├── api.ts                # Axios instance + all API endpoints
│   └── wallet.ts             # Web3 wallet service
└── types.ts                  # TypeScript interfaces

```

### Component Hierarchy
```
App
├─ NavBar (5-item mobile/desktop)
├─ Modal System
│  ├─ UploadModal (post creation)
│  ├─ AdminDashboard (vz4sheezy)
│  ├─ ProfileBuilder (customization)
│  └─ VideoModal (enlarged view)
├─ Page Router
│  ├─ AuthPage (unauthenticated)
│  ├─ Feed (mobile infinite scroll)
│  ├─ DesktopFeed (65/35 desktop layout)
│  ├─ ExplorePage (creator discovery)
│  ├─ UserProfilePage (creator profile)
│  ├─ DMSystem (messages)
│  └─ SettingsPage (user preferences)
└─ Global State
   ├─ User context (current user)
   ├─ Auth token (JWT in localStorage as cdToken)
   └─ Wallet connection (optional)
```

### Data Flow: Login
```
AuthPage
  → credentials → api.post('/auth/login')
    → Backend verifies password
    → Returns JWT token
  → localStorage.setItem('cdToken', token)
  → App.tsx reads token on mount
  → Sets user state
  → Renders Feed
```

### Data Flow: Post Creation
```
UploadModal
  → User selects video file
  → POST to Cloudinary (direct upload)
  → Cloudinary returns public_id
  → POST /api/posts with public_id
  → Backend stores in MongoDB
  → Feed polls /api/posts/{tab} (Discover/Friends/Faction)
  → Renders new video in feed
```

---

## Backend Architecture

### Stack
- **Runtime:** Node.js (Express)
- **Database:** MongoDB + Mongoose
- **Authentication:** JWT (Bearer tokens)
- **File Storage:** Cloudinary API
- **Server:** Render.com (Node deployment platform)

### Key Files
```
backend/
├── server.js              # Express setup, middleware, route mounting
├── middleware/
│   └── auth.js           # JWT verification middleware
├── models/
│   ├── User.js           # Schema: profile, followers, faction
│   ├── Post.js           # Schema: content, likes, comments
│   ├── Conversation.js   # Schema: DM thread metadata
│   ├── Message.js        # Schema: individual messages (7-day TTL)
│   └── Announcement.js   # Schema: admin-only broadcasts
├── routes/
│   ├── auth.js           # /api/auth (login, register, profile)
│   ├── users.js          # /api/users (follow, profile, search)
│   ├── posts.js          # /api/posts (feed, create, like, comment)
│   ├── dm.js             # /api/dm (conversations, messages)
│   ├── announcements.js  # /api/announcements (broadcast)
│   ├── wallet.js         # /api/wallet (balance query stubs)
│   └── upload.js         # /api/upload (Cloudinary webhooks)
├── utils/
│   ├── cloudinary.js     # Config + upload helpers
│   └── gridfs.js         # GridFS storage helpers (videos)
└── seed-comments.js      # Utility to populate test data
```

### Authentication Flow
```
Frontend sends: Authorization: Bearer <token>
Express middleware auth.js:
  ├─ Extract token from headers
  ├─ Verify signature with process.env.JWT_SECRET
  ├─ If valid: req.userId set, next()
  └─ If invalid: res.status(401).json({error: 'Unauthorized'})

Response interceptor (api.ts):
  ├─ If 401: clear localStorage, redirect to /
  └─ Otherwise: return response
```

### Database Schema (Key Collections)

**users**
```javascript
{
  _id: ObjectId,
  email: string,           // Unique
  password: bcrypt hash,
  displayName: string,
  faction: string,         // One of 20 factions or "Unaffiliated"
  followers: [ObjectId],   // User IDs
  following: [ObjectId],   // User IDs
  avatar: string,          // Cloudinary URL
  bio: string,
  profileWidgets: [{       // MySpace-style customization
    id: string,
    type: string,
    content: object
  }],
  stats: {
    followers: number,
    following: number,
    totalLikes: number
  },
  createdAt: Date
}
```

**posts**
```javascript
{
  _id: ObjectId,
  creatorId: ObjectId,     // Ref to User
  content: string,         // Caption
  videoUrl: string,        // Cloudinary public_id
  likes: [ObjectId],       // User IDs who liked
  comments: [{
    authorId: ObjectId,
    text: string,
    createdAt: Date
  }],
  createdAt: Date
}
```

**messages**
```javascript
{
  _id: ObjectId,
  conversationId: ObjectId, // Ref to Conversation
  senderId: ObjectId,       // Ref to User
  text: string,
  isVanishing: boolean,     // Disappears after 7 days
  readBy: [ObjectId],       // Users who read
  expiresAt: Date,          // TTL index (7 days)
  createdAt: Date
}
```

### Key Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/register` | POST | No | Create account |
| `/api/auth/login` | POST | No | Get JWT token |
| `/api/auth/me` | GET | Yes | Current user profile |
| `/api/users/search` | GET | Yes | Search by username |
| `/api/users/{id}/follow` | POST | Yes | Follow creator |
| `/api/users/{id}/unfollow` | POST | Yes | Unfollow creator |
| `/api/posts` | POST | Yes | Create post |
| `/api/posts/{tab}` | GET | Yes | Get feed (discover/friends/faction) |
| `/api/posts/{id}/like` | POST | Yes | Like post |
| `/api/posts/{id}/comment` | POST | Yes | Comment on post |
| `/api/dm/conversations` | GET | Yes | List DM threads |
| `/api/dm/send` | POST | Yes | Send message |
| `/api/announcements` | POST | Admin | Create broadcast |
| `/api/wallet/balance` | GET | Yes | Get crypto balances (stub) |

---

## External Dependencies

### Cloudinary
- **Purpose:** Video upload, transcoding, CDN delivery
- **API Version:** v2 (RESTful)
- **Flow:** Frontend uploads directly to Cloudinary → Returns public_id → Backend stores reference
- **Config:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (env vars)

### Web3 / MetaMask
- **Purpose:** Wallet connection for Web3 authentication (future: tips/payments)
- **Currently:** Balance query stubs, no real integration
- **Frontend:** `WalletConnect.tsx` handles MetaMask connection, signature, verification
- **Backend:** `/api/wallet/balance` endpoint exists but returns mock data

### MongoDB Atlas
- **Purpose:** Managed database hosting
- **Connection:** Mongoose through `process.env.MONGODB_URI`
- **Version:** 5.0+
- **Cluster:** Cluster0 (production)
- **Backups:** Daily automatic backups

### Vercel
- **Purpose:** Frontend deployment
- **CI/CD:** Automatic on git push to main
- **URL:** https://project-x-sage-nine.vercel.app
- **Config:** `vercel.json` (build settings)
- **Environment:** Automatically injects env vars at build time

### Render.com
- **Purpose:** Backend deployment
- **Type:** Web Service (Node.js)
- **URL:** https://cyberdope-api.onrender.com
- **Cold Starts:** ~10 seconds (free tier)
- **Environment:** Env vars configured in Render dashboard

---

## Data Flow Summary

### Write Path (Create Post)
```
Frontend UploadModal
  ↓ File upload
Cloudinary API
  ↓ Returns public_id
Frontend calls POST /api/posts
  ↓ JWT verified
Backend route /posts.js (authenticate)
  ↓ Store to MongoDB
Database (posts collection)
  ↓ Success response
Frontend refetches /api/posts/{tab}
  ↓ Infinite scroll loads new post
Feed displays new video
```

### Read Path (Fetch Feed)
```
Frontend Feed component
  ↓ GET /api/posts/discover?page=1&limit=20
Backend /posts.js (authenticate)
  ↓ Query MongoDB for latest posts
Database (posts with pagination)
  ↓ Return JSON array
Frontend maps posts to components
  ↓ Renders VideoPlayer
Cloudinary CDN serves video
```

### Authentication Path
```
Frontend AuthPage (credentials)
  ↓ POST /api/auth/login
Backend /auth.js
  ↓ Hash password, compare
Database (users)
  ↓ Match found
Backend JWT.sign(userId, secret)
  ↓ Return token
Frontend localStorage.setItem('cdToken', token)
  ↓ Used in all future requests
Api.interceptors (request)
  ↓ Authorization: Bearer {token}
Backend middleware auth.js
  ↓ Verify signature
Request proceeds or 401 response
```

---

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=https://cyberdope-api.onrender.com/api/
```

### Backend (.env)
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<long-secret-key>
CLOUDINARY_CLOUD_NAME=<cloud>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>
PORT=5000
NODE_ENV=production
```

---

## Deployment Pipeline

### Frontend
```
Push to main/master
  ↓ Vercel webhook triggers
npm run build (Vite)
  ↓ Produces optimized dist/
npm run preview (local test)
  ↓ Health check
Deploy to production
  ↓ CNAME points to Vercel edge
Users access project-x-sage-nine.vercel.app
```

### Backend
```
Push to main/master (or manual trigger)
  ↓ Render webhook
git clone repo
  ↓ Install dependencies
npm start (starts server.js)
  ↓ Connects to MongoDB
Service available at cyberdope-api.onrender.com
  ↓ Old deployment stops
New deployment running
```

---

## Performance & Scaling Notes

### Frontend
- **Bundle Size:** ~698KB (gzipped ~191KB)
- **Chunk Strategy:** Single app.js (no code splitting)
- **Optimization:** Lazy loading on videos, infinite scroll pagination
- **Concern:** Large bundle for mobile (consider code splitting)

### Backend
- **Response Time:** 200-500ms (excluding Cloudinary)
- **Cold Starts:** ~10s on first request after idle (Render free tier)
- **Pagination:** 20 items per page default
- **Concern:** No caching layer (consider Redis for feed pagination)

### Database
- **Query Performance:** Unindexed queries on large collections
- **Concern:** Email lookups unindexed, follower list could be slow

---

## Current Limitations

1. **No real payments** - Wallet integration stubbed, no Stripe/Coinbase
2. **No video processing** - Relies on Cloudinary, no custom filters
3. **No recommendation algorithm** - Feed is mostly chronological
4. **No real-time messaging** - WebSocket not implemented
5. **No mobile app** - Web-only (responsive design)
6. **No admin analytics** - Dashboard exists but no real metrics
7. **Single database** - No sharding, limited to MongoDB Atlas free tier capacity
