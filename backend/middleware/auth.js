const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cyberdope-secret-key');
      
      // Get user from token
      req.user = await User.findById(decoded.userId);
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Optional auth - doesn't require token but adds user if present
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cyberdope-secret-key');
        req.user = await User.findById(decoded.userId);
      } catch (err) {
        // Invalid token, continue without user
        req.user = null;
      }
    }

    next();
  } catch (error) {
    next();
  }
};

// Check if user is age verified for NSFW content
exports.requireAgeVerified = async (req, res, next) => {
  if (!req.user.isAgeVerified) {
    return res.status(403).json({
      success: false,
      message: 'Age verification required to access this content',
      requiresAgeVerification: true
    });
  }
  next();
};

// Check if user has active subscription to creator
exports.requireSubscription = async (req, res, next) => {
  const { creatorId } = req.params;
  
  // Check if user is subscribed to this creator
  const isSubscribed = req.user.subscriptions.some(
    sub => sub.creator.toString() === creatorId && 
           sub.status === 'active' && 
           sub.expiresAt > new Date()
  );

  if (!isSubscribed && req.user._id.toString() !== creatorId) {
    return res.status(403).json({
      success: false,
      message: 'Subscription required to access this content',
      requiresSubscription: true
    });
  }

  next();
};

// Admin middleware
exports.adminOnly = async (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};
