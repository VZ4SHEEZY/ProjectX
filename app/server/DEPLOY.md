# Deploy CyberDope Backend

## Option 1: Render (Recommended - Free)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → Sign up
3. Click "New Web Service"
4. Connect your GitHub repo
5. Settings:
   - **Build Command:** `cd server && npm install` (or leave blank for simple-server.js)
   - **Start Command:** `node server/simple-server.js`
   - **Plan:** Free
6. Click "Create Web Service"

Your backend will be live at `https://cyberdope-api.onrender.com`

## Option 2: Railway (Free)

1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. New Project → Deploy from GitHub repo
4. Add environment variable: `PORT=3000`
5. Deploy!

## Option 3: Fly.io (Free tier)

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy
cd server
fly launch
fly deploy
```

## After Deployment

Update your frontend `config.ts`:
```ts
export const API_BASE_URL = 'https://your-backend-url.com';
```

Then rebuild and redeploy the frontend.
