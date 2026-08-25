/**
 * Admin authorization middleware
 * Checks if user has isAdmin flag set to true
 * Fails closed: missing field defaults to false (not admin)
 */

const AuditLog = require('../models/AuditLog');
const { hasPlatformRole } = require('../services/platformAuthorization');

// Require admin access
exports.requireAdmin = async (req, res, next) => {
  // Check if user is authenticated first
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check isAdmin flag (defaults to false if missing)
  if (!await hasPlatformRole(req.user, 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  // User is admin, continue
  next();
};

exports.requirePlatformOwner = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
  if (!await hasPlatformRole(req.user, 'platform_owner')) {
    return res.status(403).json({ success: false, message: 'Platform owner access required' });
  }
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
          actorRole: await hasPlatformRole(req.user, 'platform_owner') ? 'platform_owner' : 'admin',
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
