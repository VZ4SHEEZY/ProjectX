const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { privateVerificationProjection } = require('../services/accessPolicy');

// @route   POST /api/age-verification/request
// @desc    Request age verification (upload ID + selfie)
// @access  Private
router.post('/request', protect, (_req, res) => res.status(501).json({ success: false, code: 'IDENTITY_VERIFICATION_UNAVAILABLE', message: 'Age verification provider is not configured. Do not submit identity media.' }));

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
