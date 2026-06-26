# CyberDope: How to Run, Build & Deploy

**Quick Reference:** This is your playbook for developing locally, building, and deploying to production.

---

## Local Development

### Prerequisites
```bash
# Install Node.js 18+ (you have 22.16.0 ✓)
node --version   # v22.16.0

# Install MongoDB locally (optional, can use Atlas)
brew install mongodb-community

# OR use Docker
docker run -d -p 27017:27017 mongo:latest
```

### Frontend Setup

```bash
cd /Users/bojackson/ProjectX/app

# Install dependencies
npm install

# Start development server (HMR enabled)
npm run dev
# Opens at http://localhost:5173

# Build for production
npm run build
# Output: dist/

# Preview production build locally
npm run preview
# Opens at http://localhost:4173 (non-HMR)

# TypeScript check (no emit)
npx tsc --noEmit

# Lint (if configured)
npm run lint  # (not currently set up)
```

### Backend Setup

```bash
cd /Users/bojackson/ProjectX/backend

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
MONGODB_URI=mongodb://localhost:27017/cyberdope
JWT_SECRET=your-secret-key-here-min-32-chars-please
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
PORT=5000
NODE_ENV=development
EOF

# Start development server (auto-restart on file changes)
npm start
# Runs on http://localhost:5000

# Or with nodemon (if installed)
npx nodemon server.js

# Test endpoints
curl http://localhost:5000/health
# Returns: { status: 'ok' }
```

### Full Stack Local

```bash
# Terminal 1: Backend
cd /Users/bojackson/ProjectX/backend
npm start

# Terminal 2: Frontend
cd /Users/bojackson/ProjectX/app
npm run dev

# Terminal 3: Database (if running locally)
mongod --dbpath /usr/local/var/mongodb

# Now:
# Frontend: http://localhost:5173
# Backend:  http://localhost:5000
# Database: localhost:27017
```

### Environment Variables

**Frontend** - `app/.env` (or `.env.local` for secrets)
```
VITE_API_URL=http://localhost:5000/api/
```

**Backend** - `backend/.env`
```
# Database
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/cyberdope

# JWT
JWT_SECRET=min-32-character-string-for-production

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Server
PORT=5000
NODE_ENV=development|staging|production

# Optional: Web3/Payments
COINBASE_COMMERCE_KEY=key
COINBASE_WEBHOOK_SECRET=secret
INFURA_API_KEY=key  # For Web3 balance queries
```

---

## Development Workflow

### Making a Change

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes (frontend and/or backend)
# Edit files...

# 3. Test locally
# Frontend: Browser devtools
# Backend: curl or Postman

# 4. Verify build still works
cd app && npm run build

# 5. Commit with clear message
git add .
git commit -m "feat: description of what changed"

# 6. Push to GitHub
git push origin feature/my-feature

# 7. Create pull request (optional)
# Vercel will auto-build and preview
```

### Testing an API Endpoint

```bash
# Login first
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@cyberdope.com","password":"CyberDope2026"}'

# Response: { token: "eyJhbGc...", user: {...} }
TOKEN="eyJhbGc..."

# Use token in requests
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/auth/me

# Get discover feed
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:5000/api/posts/discover?page=1&limit=20'
```

---

## Building for Production

### Frontend Build

```bash
cd /Users/bojackson/ProjectX/app

# Clean
rm -rf dist/

# Build
npm run build

# Output analysis
ls -lh dist/assets/

# Test locally before deploying
npm run preview
# Open http://localhost:4173
# Test all pages work, no console errors
```

### Expected Output
```
dist/
├── index.html         (1.5 KB)
├── assets/
│   ├── index.CX5uwYSn.js      (698 KB, your app bundle)
│   ├── index.DPK6yE5g.css     (6.64 KB, styles)
│   └── [other assets]
└── .vite/manifest.json        (Vercel reference)
```

### Bundle Analysis
```bash
# If you want to understand bundle size
npm run build --analyze
# (Not currently configured, would need vite-plugin-visualizer)

# Current size: ~698 KB
# Gzipped: ~191 KB
# Load time on 3G: ~2-3 seconds
```

### Backend Build
No build needed - Node.js runs from source. But you can verify it works:

```bash
cd /Users/bojackson/ProjectX/backend

# Start
npm start

# Test health
curl http://localhost:5000/health

# Should respond: { status: 'ok' }
```

---

## Deployment to Production

### Architecture
```
GitHub (source)
  ↓ push to main
  ├→ Vercel (auto-build) → project-x-sage-nine.vercel.app
  └→ Render (auto-deploy) → cyberdope-api.onrender.com
```

### Frontend Deployment (Vercel)

**One-Time Setup** (already done, but reference):
```bash
# Vercel connects to GitHub via webhook
# Automatic builds on: git push origin main

# To verify:
cd /Users/bojackson/ProjectX
git remote -v
# Should show origin pointing to GitHub
```

**To Deploy:**
```bash
# 1. Commit and push to main
git checkout main
git pull origin main
git merge feature/my-feature  # or via GitHub PR

git push origin main

# 2. Vercel auto-triggers
# Webhook hits Vercel
# Vercel clones repo
# Runs: npm run build in app/ directory
# Uploads dist/ to CDN

# 3. Check deployment
# https://vercel.com/dashboard
# Or: https://project-x-sage-nine.vercel.app

# 4. If failed, check logs
# Vercel dashboard → project → Deployments → logs
```

**Environment Variables** (Vercel Dashboard):
```
VITE_API_URL=https://cyberdope-api.onrender.com/api/
```

**Rollback if Broken:**
```
# Vercel dashboard → Deployments → [previous deployment] → Promote to production
```

### Backend Deployment (Render)

**One-Time Setup** (already done, but reference):
```bash
# Render connected to GitHub
# Trigger: git push or manual redeploy
```

**To Deploy:**
```bash
# 1. Commit and push to main
git checkout main
git pull origin main
git merge feature/my-feature

git push origin main

# 2. Render auto-deploys
# Webhook triggers build
# Installs dependencies: npm install
# Starts app: npm start

# 3. Check deployment
# https://render.com/dashboard
# Status: Deploying → Live

# 4. Monitor logs
# Render dashboard → Service → Logs
# Should see: "Server running on port 5000"
```

**Environment Variables** (Render Dashboard):
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
NODE_ENV=production
PORT=5000
```

**Troubleshooting Cold Starts:**
```bash
# Render free tier has ~10s cold starts
# If too slow, upgrade to paid tier
# Or use Render's keep-alive service

# Check if running
curl https://cyberdope-api.onrender.com/health
# Should return quickly if warm
```

### Full Deployment Checklist

```bash
# Before deploying:
- [ ] Code committed with clear messages
- [ ] npm run build succeeds locally
- [ ] No console errors in preview
- [ ] API endpoints tested with token
- [ ] Environment variables set on Vercel/Render
- [ ] MongoDB connection tested
- [ ] Cloudinary key working

# Deploy:
- [ ] git push origin main
- [ ] Watch Vercel build (vercel.com/dashboard)
- [ ] Watch Render deploy (render.com/dashboard)
- [ ] Test live: https://project-x-sage-nine.vercel.app
- [ ] Check backend health: https://cyberdope-api.onrender.com/health

# If broken:
- [ ] Check Vercel logs → app/.env not found?
- [ ] Check Render logs → Connection timeout?
- [ ] Rollback: Vercel dashboard → previous deploy → Promote
```

---

## Common Issues & Fixes

### Frontend Issues

**Error: "Module not found"**
```bash
# Problem: Dependency missing
# Fix: npm install
npm install
npm run build
```

**Error: "API_URL undefined"**
```bash
# Problem: .env not found or not loaded
# Fix: Create app/.env
echo 'VITE_API_URL=http://localhost:5000/api/' > app/.env

# Restart dev server (env loaded at startup)
npm run dev
```

**Error: "CORS error" on API call**
```bash
# Problem: Backend doesn't allow frontend origin
# Fix: Check backend/server.js has cors enabled
# Should have: cors({ origin: '*' }) or specific origin
```

**Build size too large**
```bash
# Problem: Bundle > 1MB
# Current: 698KB (OK)
# Fix: Code splitting, lazy loading, remove deps
npm run build --analyze  # (if plugin installed)
```

### Backend Issues

**Error: "MongoDB connection failed"**
```bash
# Problem: MONGODB_URI incorrect or DB down
# Fix: Check .env has correct URI
# Test connection
mongosh "mongodb+srv://user:pass@cluster.mongodb.net"
```

**Error: "Cannot find module"**
```bash
# Problem: npm install didn't complete
# Fix: Clean and reinstall
rm -rf node_modules package-lock.json
npm install
npm start
```

**Error: "Port 5000 already in use"**
```bash
# Problem: Another process using port
# Fix: Kill and restart
lsof -i :5000       # Find process
kill -9 <PID>       # Kill it
npm start           # Restart
```

**Error: "Cloudinary auth failed"**
```bash
# Problem: API keys wrong
# Fix: Verify keys in .env
# Get from: https://cloudinary.com/console/settings/api-keys
```

### Deployment Issues

**Vercel: Build failed - "npm ERR!"**
```bash
# Problem: Dependencies don't install on Vercel
# Fix: Check package.json, lock file, node version
# Vercel uses: Node 18+ (check dashboard settings)

# Try locally:
npm ci --legacy-peer-deps
npm run build
```

**Render: "Cannot GET /"**
```bash
# Problem: Server not starting properly
# Fix: Check logs, verify PORT env var set
# Make sure: npm start works locally

# Test:
npm start
curl http://localhost:5000/health
```

**Render: "Cold start timeout"**
```bash
# Problem: Free tier, takes >30s to start
# Fix: Upgrade to paid tier
# OR: Use external keep-alive service (UptimeRobot)
```

---

## Monitoring & Logs

### View Frontend Logs

**Browser DevTools:**
```
Chrome → F12 → Console
Check for errors, API responses, network waterfall
```

**Vercel Build Logs:**
```
vercel.com/dashboard
→ [project] → Deployments → [deployment] → View Logs

Look for:
✓ 1821 modules transformed
✓ built in 2.33s
✓ dist/assets/index.*.js generated
```

### View Backend Logs

**Local:**
```bash
npm start
# See real-time logs in terminal
# Look for: "Server running on port 5000"
```

**Render:**
```
render.com/dashboard
→ [service] → Logs

Real-time streaming, shows:
- Server startup messages
- API requests (if logged)
- Errors and warnings
- Database connection status
```

### Test Production Endpoints

```bash
# Frontend deployed?
curl https://project-x-sage-nine.vercel.app/
# Should return HTML

# Backend running?
curl https://cyberdope-api.onrender.com/health
# Should return: { status: 'ok' }

# Can login?
curl -X POST https://cyberdope-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@cyberdope.com","password":"CyberDope2026"}'

# Get token, test protected endpoint
TOKEN="..."
curl -H "Authorization: Bearer $TOKEN" \
  https://cyberdope-api.onrender.com/api/auth/me
```

---

## Troubleshooting Deployment Issues

### Scenario: "App loads but no posts showing"

```bash
# 1. Check frontend API URL
# Open browser DevTools → Network
# POST to /api/posts/discover should show

# 2. If 401 error
# Backend returned unauthorized
# Check: localStorage has cdToken?
# Check: Token not expired?

# 3. If 500 error
# Backend crashed or DB error
# Check Render logs
# Check MongoDB connection

# 4. If network error
# Backend URL wrong
# Check VITE_API_URL in Vercel env vars
# Should be: https://cyberdope-api.onrender.com/api/
```

### Scenario: "Cloudinary upload failing"

```bash
# 1. Check API keys
# echo $CLOUDINARY_API_KEY  (backend)

# 2. Test upload
curl -X POST http://localhost:5000/api/upload \
  -F "file=@video.mp4" \
  -H "Authorization: Bearer $TOKEN"

# 3. Check response
# Should return: { publicId: '...', url: '...' }

# 4. If failed
# Check: CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET
# Verify: API key has upload permissions
```

---

## Quick Commands Reference

```bash
# Development
npm run dev              # Frontend: localhost:5173 with HMR
npm start               # Backend: localhost:5000

# Building
npm run build           # Frontend: create optimized dist/
npm run preview         # Frontend: test production build locally

# Verification
npm run build           # Will fail fast if errors
curl http://localhost:5000/health

# Deployment
git push origin main    # Triggers Vercel + Render

# Clean slate
rm -rf node_modules package-lock.json && npm install

# Check versions
node --version          # Should be 18+
npm --version           # Should be 8+
```

---

## Environments

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| **Local** | http://localhost:5173 | http://localhost:5000 | localhost:27017 (or Atlas) |
| **Production** | https://project-x-sage-nine.vercel.app | https://cyberdope-api.onrender.com | MongoDB Atlas Cluster0 |

---

## One-Click Deployment

**If you already have Vercel + Render connected:**

```bash
# 1. Make your changes
git commit -am "feat: add new feature"

# 2. Push to main
git push origin main

# 3. Both platforms auto-deploy
# Vercel builds and deploys frontend
# Render builds and starts backend
# ~3-5 minutes for both to be live

# 4. Verify
curl https://cyberdope-api.onrender.com/health
# Should return quickly

open https://project-x-sage-nine.vercel.app
# Should load your changes
```

---

## Checklist for New Developer

If someone else needs to work on CyberDope:

- [ ] Clone repo: `git clone ...`
- [ ] Install Node.js 18+ (or use nvm)
- [ ] `cd app && npm install && npm run build` (should pass)
- [ ] `cd ../backend && npm install`
- [ ] Create `backend/.env` (ask you for secrets)
- [ ] `npm start` (backend should start)
- [ ] `cd ../app && npm run dev` (frontend should load)
- [ ] Open http://localhost:5173 in browser
- [ ] Try to login with test@cyberdope.com / CyberDope2026
- [ ] If it works, they're ready to develop!

---

## Final Notes

- **Vercel auto-redeploys on git push to main** - no manual steps needed
- **Render auto-redeploys on git push** - no manual steps needed
- **Database is remote (MongoDB Atlas)** - no local DB needed for testing if using production URI
- **Cold starts on Render** - first request after idle is slow (10s), then fast
- **Always test locally first** - `npm run build && npm run preview` before pushing
- **Bundle size matters** - 698KB is OK for now, but watch for growth
