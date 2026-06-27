/**
 * Admin authorization middleware
 * Checks if user has isAdmin flag set to true
 * Fails closed: missing field defaults to false (not admin)
 */

const AuditLog = require('../models/AuditLog');

// Require admin access
exports.requireAdmin = (req, res, next) => {
  // Check if user is authenticated first
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check isAdmin flag (defaults to false if missing)
  if (req.user.isAdmin !== true) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  // User is admin, continue
  next();
};

// Log admin action (call after requireAdmin middleware)
exports.logAdminAction = (actionType) => {
  return async (req, res, next) => {
    // Attach logging function to req for later use
    req.logAdminAction = async (details = {}) => {
      try {
        await AuditLog.create({
          admin: req.user._id,
          action: actionType,
          targetType: details.targetType || null,
          targetId: details.targetId || null,
          faction: details.faction || null,
          details: {
            ...details,
            timestamp: new Date()
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent')
        });
      } catch (error) {
        console.error('Failed to log admin action:', error);
        // Don't fail the request if logging fails, just log the error
      }
    };

    next();
  };
};
