const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const { hasPlatformRole, rolesFor } = require('../services/platformAuthorization');
const { canViewPost } = require('../services/accessPolicy');
const Post = require('../models/Post');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const router = express.Router();
const reasons = new Set(['harassment', 'spam', 'illegal_content', 'privacy', 'other']);
const privileged = async (req, res, next) => {
  try { if (!await hasPlatformRole(req.user, 'moderator')) return res.status(403).json({ error: 'Moderator permission required' }); next(); }
  catch { res.status(503).json({ error: 'Authorization unavailable' }); }
};
router.post('/reports', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.body.postId) || !reasons.has(req.body.reason)) return res.status(400).json({ error: 'Valid post and report reason required' });
    const post = await Post.findById(req.body.postId).populate('author');
    if (!post || !(await canViewPost(req.user, post)).allowed) return res.status(404).json({ error: 'Content unavailable' });
    const updated = await Post.findOneAndUpdate({ _id: post._id, 'reports.user': { $ne: req.user._id } }, { $push: { reports: { user: req.user._id, reason: req.body.reason } }, $set: { isReported: true } });
    res.json({ success: true, duplicate: !updated });
  } catch { res.status(500).json({ error: 'Report could not be submitted' }); }
});
router.get('/queue', protect, privileged, async (_req, res) => {
  try {
    const posts = await Post.find({ isReported: true }).select('author title content status moderationState reports createdAt').sort({ createdAt: 1 }).limit(100).lean();
    res.json({ success: true, posts });
  } catch { res.status(500).json({ error: 'Moderation queue unavailable' }); }
});
router.get('/audit', protect, privileged, async (_req, res) => {
  try { res.json({ success: true, logs: await AuditLog.find({ action: { $in: ['moderation_remove', 'moderation_dismiss', 'moderation_suspend_user'] } }).select('admin actorRole action targetType targetId details createdAt').sort({ createdAt: -1 }).limit(100).lean() }); }
  catch { res.status(500).json({ error: 'Audit log unavailable' }); }
});
router.post('/enforce', protect, privileged, async (req, res) => {
  const { action, targetId, reason } = req.body;
  if (!['remove', 'dismiss', 'suspend_user'].includes(action) || !mongoose.isValidObjectId(targetId) || typeof reason !== 'string' || !reason.trim() || reason.length > 500) return res.status(400).json({ error: 'Valid action, target and reason required' });
  try {
    if (action === 'suspend_user' && !await hasPlatformRole(req.user, 'admin')) return res.status(403).json({ error: 'Admin permission required to suspend accounts' });
    if (action === 'suspend_user') {
      const target = await User.findById(targetId);
      if (!target || await hasPlatformRole(target, 'moderator')) return res.status(403).json({ error: 'Privileged accounts cannot be suspended here' });
    }
    const roles = await rolesFor(req.user);
    const actorRole = roles.includes('platform_owner') ? 'platform_owner' : req.user.isAdmin || roles.includes('admin') ? 'admin' : 'moderator';
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const target = action === 'suspend_user' ? await User.findOneAndUpdate({ _id: targetId }, { isActive: false }, { session }) : await Post.findOneAndUpdate({ _id: targetId, isReported: true }, action === 'remove' ? { moderationState: 'removed', status: 'archived', isReported: false } : { isReported: false }, { session });
        if (!target) throw new Error('TARGET_UNAVAILABLE');
        await AuditLog.create([{ admin: req.user._id, actorRole, action: `moderation_${action}`, targetType: action === 'suspend_user' ? 'user' : 'post', targetId, details: { reason: reason.trim(), previousStatus: action === 'suspend_user' ? target.isActive : target.status } }], { session });
      });
    } finally { await session.endSession(); }
    res.json({ success: true });
  } catch (error) { res.status(error.message === 'TARGET_UNAVAILABLE' ? 409 : 503).json({ error: 'Enforcement failed; no unaudited action was applied' }); }
});
module.exports = router;
