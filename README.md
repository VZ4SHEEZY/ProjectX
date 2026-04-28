# CyberDope V1 - Development Handoff Guide

## Quick Status

**Project:** TikTok + MySpace + Web3 social platform  
**Status:** V1 features in development  
**Latest Commit:** `f7ddada` - Profile layout persistence  
**Deployed:** https://project-x-sage-nine.vercel.app

---

## What's Built ✅

### Social Features
- ✅ Feed (Discover, Friends, Faction tabs)
- ✅ Video upload via Cloudinary
- ✅ Like/Unlike system
- ✅ Comments (post, delete, display)
- ✅ Follow/Unfollow
- ✅ User profiles (public/private)
- ✅ Clickable usernames across all pages

### Profile Customization (Just Completed)
- ✅ Drag-drop widget layout editor
- ✅ 9 widgets available (Music, TopFriends, SocialHub, GeoNode, Assets, DataLog, CustomCode, Checkins, Trophies)
- ✅ Left/Right/Bottom zones
- ✅ Hide/Show widgets
- ✅ Save layout to DB
- ✅ Persistent across page refreshes

### Navigation & Auth
- ✅ 5-item nav (HOME, EXPLORE, CREATE, MESSAGES, PROFILE)
- ✅ Auth token integration
- ✅ User login/signup
- ✅ Profile privacy settings

---

## What's Next (Priority Order)

1. **Stripe Payments** (monetization blocker)
   - Subscriptions
   - Tips/donations
   - PPV content (post-V1)

2. **Vanishing DMs** (messaging features)
   - 4-layer system: Standard/Vanish/Locked/Vault
   - 7-day auto-delete
   - Screenshot alerts

3. **Referral System** (growth)
   - Tier structure: Spark → Sovereign
   - Tracking & payouts

4. **Creator Dashboard** (analytics)
   - Earnings
   - Subscriber management
   - Analytics

---

## File Structure

```
ProjectX/
├── app/                          (Frontend - React/Vite)
│   ├── components/
│   │   ├── ProfileGrid.tsx       (Main profile page - uses layout system)
│   │   ├── ProfileBuilder.tsx    (Drag-drop widget editor)
│   │   ├── ProfileDesignModal.tsx (DESIGN modal with LAYOUT tab)
│   │   ├── ProfileWidgetRenderer.tsx (Widget map & rendering logic)
│   │   ├── Feed.tsx              (Discover/Friends/Faction tabs)
│   │   ├── ExplorePage.tsx       (Explore videos)
│   │   ├── VideoModal.tsx        (Unified video player)
│   │   ├── UserProfilePage.tsx   (Public user profiles)
│   │   └── [Other widgets]
│   ├── services/
│   │   ├── api.ts                (API client - PUT /users/profile saves layout)
│   │   └── aiService.ts
│   ├── types.ts                  (TypeScript interfaces)
│   ├── App.tsx                   (Main app router)
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                       (Node.js/Express API)
│   ├── routes/
│   │   ├── users.js              (PUT /users/profile - handles profileLayout)
│   │   ├── posts.js
│   │   ├── comments.js
│   │   └── [other routes]
│   ├── models/
│   │   ├── User.js               (Has profileLayout field)
│   │   ├── Post.js
│   │   └── Comment.js
│   ├── server.js
│   ├── package.json
│   └── .env                      (MongoDB URI, JWT secret)
│
├── .git/                          (Git history - all commits)
├── package.json                   (Root package)
└── README.md                      (This file)
```

---

## Key Technical Details

### Profile Layout System
- **DB Field:** `User.profileLayout` object with:
  - `leftZone: string[]` - widget IDs in left column
  - `rightZone: string[]` - widget IDs in right column
  - `bottomZone: string[]` - locked (always 'posts')
  - `mobileOrder: string[]` - vertical stack for mobile
  
- **Frontend:** ProfileWidgetRenderer maps IDs to React components
- **Save Flow:** ProfileBuilder → userAPI.updateProfile() → backend PUT → DB → onProfileUpdate() → ProfileGrid renders

- **Widgets Available:**
  - `music` - MusicPlayerWidget
  - `topfriends` - TopFriendsWidget
  - `socialhub` - SocialHubWidget
  - `geonode` - GeoNodeWidget
  - `assets` - AssetGalleryWidget
  - `datalog` - DataLogWidget
  - `customcode` - CustomCodeWidget (stub)
  - `checkins` - CheckinsWidget (stub)
  - `trophies` - TrophiesWidget (stub)

### API Endpoints
```
POST   /auth/register
POST   /auth/login
GET    /users/profile
PUT    /users/profile              (accepts profileLayout)
GET    /users/:id
GET    /posts/feed/discover
GET    /posts/feed/following
GET    /posts/feed/faction
POST   /posts
POST   /posts/:id/like
DELETE /posts/:id/like
POST   /posts/:id/comments
DELETE /comments/:id
POST   /users/:id/follow
DELETE /users/:id/follow
```

---

## How to Resume Development

### 1. Check Latest Commits
```bash
cd /Users/bojackson/ProjectX
git log --oneline -10
```

### 2. See What Changed
```bash
git show f7ddada      # Latest commit (profile layout fix)
```

### 3. Run Frontend (Dev)
```bash
cd app
npm install           # If needed
npm run dev
# Opens at http://localhost:5173
```

### 4. Run Backend (Dev)
```bash
cd backend
npm install           # If needed
npm start
# Runs at http://localhost:5000
```

### 5. Deploy Changes
```bash
git add .
git commit -m "your message"
git push origin master
# Frontend auto-deploys on Vercel
# Backend needs manual deploy or auto-hook to Render
```

---

## Test Accounts

**Test User:**
- Email: `test@cyberdope.com`
- Password: `CyberDope2026`
- Faction: Iron Veil

**Creator Account:**
- Username: `vz4sheezy`
- ID: `69c03c1f50bf927b744dd5d9`
- Has 2 uploaded videos

---

## Critical Context

**Codebase Location:** `/Users/bojackson/ProjectX/`  
**Frontend Deployed:** https://project-x-sage-nine.vercel.app (Vercel - auto-deploys on git push)  
**Backend API:** https://cyberdope-api.onrender.com (Render)  
**Database:** MongoDB Atlas  

**Environment Files:**
- `backend/.env` - MongoDB URI, JWT secret, Cloudinary keys (NOT in git)

---

## Handoff Checklist

When resuming after a break:

- [ ] Check git log to see latest work
- [ ] Verify Vercel deployment (https://project-x-sage-nine.vercel.app)
- [ ] Test on live site (profile → DESIGN → LAYOUT → drag widgets)
- [ ] Review memory files for context (`/Users/bojackson/.openclaw/workspace/memory/`)
- [ ] Run local dev environment if making changes
- [ ] Push to GitHub after testing

---

## Important Notes

⚠️ **Profile Customization is COMPLETE** but:
- Only 3 of 9 widgets are fully implemented (Music, TopFriends, SocialHub)
- Others (GeoNode, Assets, DataLog, etc.) render but may be stubs
- Mobile layout stacks widgets vertically (works)

🔐 **Security:**
- Auth tokens stored in localStorage
- Passwords hashed in DB
- API requires JWT auth on protected routes

💾 **Data Persistence:**
- All user data goes to MongoDB
- Cloudinary stores video files
- Layout saves immediately on SAVE button click

---

## Questions?

Check:
1. `/Users/bojackson/.openclaw/workspace/memory/` - Session notes
2. Desktop docs - CyberDope_Master_Blueprint_V3.docx
3. Git history - `git log`, `git show <commit>`

---

**Last Updated:** 2026-04-28  
**By:** Bo Jackson  
**Status:** Ready for next phase (Stripe payments)
