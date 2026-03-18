# CyberDope API Server

Secure backend proxy for CyberDope that hides your OpenAI API key.

## Setup

```bash
cd server
npm install
npm start
```

The server runs on `http://localhost:3001`

## API Endpoints

- `POST /api/chat` - Proxy to OpenAI chat completions
- `GET /health` - Health check

## Security Features

- ✅ API key stored server-side only
- ✅ Rate limiting (10 req/min per IP)
- ✅ CORS protection
- ✅ No keys exposed to frontend

## Deployment Options

### Option 1: Run Locally (Development)
```bash
npm start
```

### Option 2: Deploy to Railway/Render/Fly.io
1. Push code to GitHub
2. Connect to Railway/Render/Fly.io
3. Set environment variables if needed
4. Deploy!

### Option 3: Vercel Serverless Functions
Move `server.js` logic to `/api/chat.js` for Vercel deployment.

## Environment Variables

```bash
PORT=3001  # Optional, defaults to 3001
```
