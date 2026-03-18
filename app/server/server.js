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
  avatar: String,
  bio: String,
  isAgeVerified: Boolean,
  createdAt: Date
});
const User = mongoose.model('User', userSchema);

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
    const { username, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashed, faction: 'Unaffiliated', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`, bio: '', isAgeVerified: false, createdAt: new Date() });
    await user.save();
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { username: user.username, email: user.email, faction: user.faction, avatar: user.avatar, bio: user.bio, isAgeVerified: user.isAgeVerified } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
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
