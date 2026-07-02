const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { uploadToGridFS } = require('../utils/gridfs');

// @route   POST /api/age-verification/request
// @desc    Request age verification (upload ID + selfie)
// @access  Private
router.post('/request', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token' });
    }

    // Verify JWT first
    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'cyberdope-secret-key');
    } catch (jwtErr) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await User.findById(decoded.userId);

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

    // For now, accept self-certification without API call
    // Later: Send to AgeCheck API with the uploaded file IDs

    // Mark user as verified
    user.isAgeVerified = true;
    user.ageVerifiedAt = new Date();
    
    // Store verification metadata
    if (!user.verificationData) user.verificationData = {};
    user.verificationData.idPhotoUrl = idPhotoUrl || null;
    user.verificationData.selfieUrl = selfieUrl || null;
    user.verificationData.method = 'manual_review'; // Will be updated when API integrated
    user.verificationData.verifiedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'Age verification completed',
      isAgeVerified: true,
      ageVerifiedAt: user.ageVerifiedAt,
      verifiedBy: 'CyberDope Admin System'
    });
  } catch (error) {
    console.error('Age verification error:', error);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

// @route   GET /api/age-verification/status
// @desc    Get current age verification status
// @access  Private
router.get('/status', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token' });
    }

    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'cyberdope-secret-key');
    } catch (jwtErr) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      isAgeVerified: user.isAgeVerified || false,
      ageVerifiedAt: user.ageVerifiedAt || null,
      verificationData: user.verificationData || {}
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
