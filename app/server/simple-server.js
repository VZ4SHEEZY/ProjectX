// Simple CyberDope API Server - Zero Dependencies
// Uses only Node.js built-in modules

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3001;

// Your OpenAI API Key - SECURE on server side only
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Simple in-memory rate limiter
const requestCounts = new Map();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(clientIP) {
  const now = Date.now();
  const clientData = requestCounts.get(clientIP);
  
  if (!clientData) {
    requestCounts.set(clientIP, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (now > clientData.resetTime) {
    // Reset window
    requestCounts.set(clientIP, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (clientData.count >= RATE_LIMIT) {
    return false;
  }
  
  clientData.count++;
  return true;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Health check endpoint
  if (parsedUrl.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ status: 'OK', service: 'CyberDope API' }));
    return;
  }

  // Chat proxy endpoint
  if (parsedUrl.pathname === '/api/chat' && req.method === 'POST') {
    // Rate limiting
    if (!checkRateLimit(clientIP)) {
      res.writeHead(429, corsHeaders);
      res.end(JSON.stringify({ error: 'Too many requests, please try again later.' }));
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { messages, model = 'gpt-4o-mini', max_tokens = 150, temperature = 0.9 } = JSON.parse(body);

        if (!messages || !Array.isArray(messages)) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Messages array required' }));
          return;
        }

        const postData = JSON.stringify({
          model,
          messages,
          max_tokens,
          temperature
        });

        const options = {
          hostname: 'api.openai.com',
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const apiReq = https.request(options, (apiRes) => {
          let data = '';
          apiRes.on('data', chunk => data += chunk);
          apiRes.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                console.error('OpenAI API error:', parsed.error);
                res.writeHead(500, corsHeaders);
                res.end(JSON.stringify({ error: 'AI service error' }));
                return;
              }
              res.writeHead(200, corsHeaders);
              res.end(JSON.stringify(parsed));
            } catch (e) {
              console.error('Parse error:', e);
              res.writeHead(500, corsHeaders);
              res.end(JSON.stringify({ error: 'Invalid response from AI service' }));
            }
          });
        });

        apiReq.on('error', (error) => {
          console.error('Request error:', error);
          res.writeHead(500, corsHeaders);
          res.end(JSON.stringify({ error: 'Failed to connect to AI service' }));
        });

        apiReq.write(postData);
        apiReq.end();

      } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, corsHeaders);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log('🔒 CyberDope API Server running');
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`🤖 AI Proxy: http://localhost:${PORT}/api/chat`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
});
