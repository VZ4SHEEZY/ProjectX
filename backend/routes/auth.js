const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// --- Zodiac + Faction Logic ---
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
  Capricorn:   { name: 'Obsidian Pact',   color: '#4B0082' },
  Aquarius:    { name: 'Quantum Veil',    color: '#7DF9FF' },
  Pisces:      { name: 'Phantom Signal',  color: '#E8E8E8' },
};

// Generate JWT Token
const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, dateOfBirth } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username: username.toLowerCase() }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: existingUser.email === email 
          ? 'Email already registered' 
          : 'Username already taken'
      });
    }

    // Faction assignment via zodiac
    let faction = 'Quantum Veil';
    let factionColor = '#7DF9FF';
    let zodiacSign = '';
    if (dateOfBirth) {
      zodiacSign = getZodiacSign(dateOfBirth);
      const factionData = ZODIAC_FACTIONS[zodiacSign] || ZODIAC_FACTIONS['Aquarius'];
      faction = factionData.name;
      factionColor = factionData.color;
    }

    // Create new user
    const user = await User.create({
      username: username.toLowerCase(),
      email,
      password,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      faction,
      factionColor,
      zodiacSign,
      dateOfBirth: dateOfBirth || ''
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: user.toPublicProfile()
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last active
    user.lastActive = new Date();
    user.isOnline = true;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: user.toPublicProfile()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', async (req, res) => {
  try {
    // In a real app with token blacklisting, add token to blacklist here
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cyberdope-secret-key');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: user.toPublicProfile()
    });
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' });
  }
});

// @route   POST /api/auth/wallet
// @desc    Connect wallet
// @access  Private
router.post('/wallet', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const { walletAddress } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'No token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cyberdope-secret-key');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.walletAddress = walletAddress;
    await user.save();

    res.json({
      success: true,
      message: 'Wallet connected successfully',
      walletAddress
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/verify-age
// @desc    Verify age (18+)
// @access  Private
router.post('/verify-age', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const { method, signature } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'No token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cyberdope-secret-key');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // In production, verify the signature against the wallet
    // For demo, we'll accept any valid request
    user.isAgeVerified = true;
    user.ageVerifiedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Age verification completed',
      isAgeVerified: true
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
