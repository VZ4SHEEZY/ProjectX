const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();
const unavailable = (req, res) => res.status(503).json({
  success: false,
  code: 'IDENTITY_VERIFICATION_UNAVAILABLE',
  message: 'Identity verification is not currently available.'
});

router.post('/init', protect, unavailable);
router.get('/callback', unavailable);
router.post('/confirm', protect, unavailable);
router.post('/webhook', unavailable);

router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({
      success: true,
      verification: {
        available: false,
        isAgeVerified: user.isAgeVerified,
        ageVerifiedAt: user.ageVerifiedAt,
        isCreatorVerified: user.isCreatorVerified,
        creatorVerifiedAt: user.creatorVerifiedAt
      }
    });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch verification status' });
  }
});

module.exports = router;
