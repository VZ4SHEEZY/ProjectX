const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'cyberdope-secret-2077';
const MONGO_URI = 'mongodb+srv://cyberdope:CyberDope2077!@cluster0.qdpgx7l.mongodb.net/cyberdope?appName=Cluster0';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

mongoose.connect(MONGO_URI).then(() => console.log('✅ MongoDB connected')).catch(err => console.error('MongoDB error:', err));

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  faction: String,
  factionColor: String,
  zodiacSign: String,
  dateOfBirth: String,
  avatar: String,
  bio: String,
  isAgeVerified: Boolean,
  createdAt: Date
});
const User = mongoose.model('User', userSchema);

// Zodiac calculation
function getZodiacSign(dateStr) {
  const date = new Date(dateStr);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
  return 'Pisces';
}

// Zodiac -> Faction mapping
const ZODIAC_FACTIONS = {
  Aries:       { name: 'Inferno Grid',    color: '#FF4500' },
  Taurus:      { name: 'Iron Veil',       color: '#8C8C8C' },
  Gemini:      { name: 'Void Circuit',    color: '#00FFFF' },
  Cancer:      { name: 'Steel Covenant',  color: '#4A7FA5' },
  Leo:         { name: 'Gold Syndicate',  color: '#FFD700' },
  Virgo:       { name: 'Toxic Bloom',     color: '#7FFF00' },
  Libra:       { name: 'Azure Phantom',   color: '#00CCFF' },
  Scorpio:     { name: 'Neon Wraith',     color: '#9B59B6' },
  Sagittarius: { name: 'Nova Rift',       color: '#FF69B4' },
  Capricorn:   { name: 'Obsidian Pact',   color: '#2C2C2C' },
  Aquarius:    { name: 'Quantum Veil',    color: '#7DF9FF' },
  Pisces:      { name: 'Phantom Signal',  color: '#F0F0F0' },
};

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173',
      'https://project-x-sage-nine.vercel.app',
    ];
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin || allowed.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'CyberDope API' });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = password === user.password || await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { username: user.username, email: user.email, faction: user.faction, avatar: user.avatar, bio: user.bio, isAgeVerified: user.isAgeVerified } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, dateOfBirth } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);

    // Faction assignment
    let faction = 'Quantum Veil';
    let factionColor = '#7DF9FF';
    let zodiacSign = 'Aquarius';
    if (dateOfBirth) {
      zodiacSign = getZodiacSign(dateOfBirth);
      const factionData = ZODIAC_FACTIONS[zodiacSign] || ZODIAC_FACTIONS['Aquarius'];
      faction = factionData.name;
      factionColor = factionData.color;
    }

    const user = new User({
      username, email, password: hashed,
      faction, factionColor, zodiacSign, dateOfBirth,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      bio: '', isAgeVerified: false, createdAt: new Date()
    });
    await user.save();
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { username: user.username, email: user.email, faction: user.faction, factionColor: user.factionColor, zodiacSign: user.zodiacSign, avatar: user.avatar, bio: user.bio, isAgeVerified: user.isAgeVerified } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model = 'gpt-4o-mini', max_tokens = 150, temperature = 0.9 } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Messages array required' });
    const postData = JSON.stringify({ model, messages, max_tokens, temperature });
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Length': Buffer.byteLength(postData) }
    };
    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', (chunk) => { data += chunk; });
      apiRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return res.status(500).json({ error: 'AI service error' });
          res.json(parsed);
        } catch (e) { res.status(500).json({ error: 'Invalid response from AI service' }); }
      });
    });
    apiReq.on('error', () => res.status(500).json({ error: 'Failed to connect to AI service' }));
    apiReq.write(postData);
    apiReq.end();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🔒 CyberDope API Server running on port ${PORT}`);
  console.log(`🤖 AI Proxy: http://localhost:${PORT}/api/chat`);
  console.log(`🔑 Auth: http://localhost:${PORT}/api/auth/login`);
});
