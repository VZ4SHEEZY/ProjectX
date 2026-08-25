const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { privateVerificationProjection } = require('../services/accessPolicy');

// @route   POST /api/age-verification/request
// @desc    Request age verification (upload ID + selfie)
// @access  Private
router.post('/request', protect, async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already verified
    if (user.isAgeVerified) {
      return res.status(400).json({ error: 'Already age verified' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { idPhotoUrl, selfieUrl } = req.body;

    if (!idPhotoUrl || !selfieUrl) {
      return res.status(400).json({ error: 'ID photo and selfie are required' });
    }
    res.status(501).json({
      success: false,
      message: 'Age verification provider is not configured'
    });
  } catch (error) {
    console.error('Age verification error:', error);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

// @route   GET /api/age-verification/status
// @desc    Get current age verification status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, verification: privateVerificationProjection(user) });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
