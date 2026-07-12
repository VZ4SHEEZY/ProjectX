const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const yotiService = require('../services/yoti');

/**
 * Yoti Verification Routes
 * 
 * Handles age verification and identity verification via Yoti
 * Currently stubbed - will integrate with real Yoti SDK
 * 
 * Two verification tiers:
 * - Age verification (isAgeVerified) - for viewing 18+ content
 * - Identity verification (isCreatorVerified) - for posting 18+ and creator monetization
 */

// @route   POST /api/verify/yoti/init
// @desc    Initialize Yoti verification session
// @access  Private
router.post('/init', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { verificationType = 'both' } = req.body; // 'age', 'identity', or 'both'

    // Create Yoti session
    const session = await yotiService.createVerificationSession(
      user._id.toString(),
      user.email,
      verificationType
    );

    res.json({
      success: true,
      sessionId: session.sessionId,
      redirectUrl: session.redirectUrl,
      isStubbed: session.isStubbed || false
    });
  } catch (error) {
    console.error('Yoti init error:', error);
    res.status(500).json({ error: 'Failed to initialize verification' });
  }
});

// @route   GET /api/verify/yoti/callback
// @desc    Yoti callback - user redirected here after verification
// @access  Public (with sessionId validation)
router.get('/callback', async (req, res) => {
  try {
    const { session_id, status } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    if (status !== 'COMPLETE') {
      return res.status(400).json({ error: 'Verification not completed' });
    }

    // Verify the session with Yoti
    // Note: In production, we'd extract userId from session
    // For now, we'll let the frontend handle storing the session ID
    // and making a separate call to confirm verification

    res.json({
      success: true,
      message: 'Verification completed. Confirming with server...',
      sessionId: session_id,
      next: '/verify/yoti/confirm'
    });
  } catch (error) {
    console.error('Yoti callback error:', error);
    res.status(500).json({ error: 'Failed to process callback' });
  }
});

// @route   POST /api/verify/yoti/confirm
// @desc    Confirm verification and update user flags
// @access  Private
router.post('/confirm', protect, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify with Yoti service
    const verification = await yotiService.verifySession(sessionId, user._id.toString());

    // Update user flags based on verification result
    let updated = false;

    if (verification.isAgeVerified && !user.isAgeVerified) {
      user.isAgeVerified = true;
      user.ageVerifiedAt = verification.isAgeVerifiedAt || new Date();
      updated = true;
    }

    if (verification.isIdentityVerified && !user.isCreatorVerified) {
      user.isCreatorVerified = true;
      user.creatorVerifiedAt = verification.isCreatorVerifiedAt || new Date();
      updated = true;
    }

    if (updated) {
      await user.save();
    }

    // If user has pending creator application, auto-approve
    if (user.creatorStatus === 'pending' && user.isCreatorVerified) {
      user.creatorStatus = 'approved';
      user.isCreator = true;
      user.creatorApprovedDate = new Date();
      await user.save();
    }

    res.json({
      success: true,
      message: 'Verification confirmed',
      verified: {
        isAgeVerified: user.isAgeVerified,
        isCreatorVerified: user.isCreatorVerified,
        creatorStatus: user.creatorStatus
      },
      session: verification.data
    });
  } catch (error) {
    console.error('Yoti confirm error:', error);
    res.status(500).json({ error: 'Failed to confirm verification' });
  }
});

// @route   POST /api/verify/yoti/webhook
// @desc    Webhook receiver for Yoti session status changes
// @access  Private (Yoti server only - should be IP-whitelisted in production)
router.post('/webhook', async (req, res) => {
  try {
    // In production: verify webhook signature here
    const webhookData = req.body;

    const result = await yotiService.handleWebhook(webhookData);

    res.json({
      success: true,
      processed: result.processed
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// @route   GET /api/verify/yoti/status
// @desc    Check current user's verification status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      verification: {
        isAgeVerified: user.isAgeVerified,
        ageVerifiedAt: user.ageVerifiedAt,
        isCreatorVerified: user.isCreatorVerified,
        creatorVerifiedAt: user.creatorVerifiedAt
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to fetch verification status' });
  }
});

module.exports = router;
