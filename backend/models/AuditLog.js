const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Who performed the action
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // What action was performed
  action: {
    type: String,
    enum: [
      'broadcast_announcement',
      'delete_post',
      'delete_comment',
      'ban_user',
      'unban_user',
      'modify_user',
      'view_analytics',
      'create_announcement',
      'edit_announcement',
      'delete_announcement'
    ],
    required: true
  },
  
  // Target of the action (optional - null for global actions)
  targetType: {
    type: String,
    enum: ['user', 'post', 'comment', 'announcement', null],
    default: null
  },
  targetId: mongoose.Schema.Types.ObjectId,
  
  // Faction-specific actions (optional)
  faction: String,
  
  // Details about what changed/what was done
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // IP address for security tracking
  ipAddress: String,
  
  // User agent for security tracking
  userAgent: String,
  
  // Timestamp (auto-created)
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for querying by admin and date
auditLogSchema.index({ admin: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
