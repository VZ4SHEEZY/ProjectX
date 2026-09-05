const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { protect, optionalAuth } = require('../middleware/auth');
const { canViewPost } = require('../services/accessPolicy');
const { createNotification } = require('./notifications');
const mongoose = require('mongoose');
const { hasPlatformRole, auditPlatformAction } = require('../services/platformAuthorization');
const { withProgressionOutbox } = require('../progression/runtime/outbox');

// @route   GET /api/posts/:postId/comments
// @desc    Get all comments for a post
// @access  Public
router.get('/posts/:postId/comments', optionalAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID' });
    }
    const { page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const post = await Post.findById(req.params.postId).populate('author', '_id profilePrivacy isPrivate faction');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (!(await canViewPost(req.user, post, post.author)).allowed) return res.status(403).json({ success: false, message: 'Post access denied' });

    const comments = await Comment.find({
      post: req.params.postId,
      parentComment: null, // Only top-level comments
      isDeleted: false
    })
    .populate('author', 'username displayName avatar isVerified')
    .populate({
      path: 'replies',
      populate: {
        path: 'author',
        select: 'username displayName avatar isVerified'
      }
    })
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const count = await Comment.countDocuments({
      post: req.params.postId,
      parentComment: null,
      isDeleted: false
    });

    res.json({
      success: true,
      count: comments.length,
      total: count,
      data: comments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/posts/:postId/comments
// @desc    Add a comment to a post
// @access  Private
router.post('/posts/:postId/comments', protect, async (req, res) => {
  try {
    const { content, parentCommentId } = req.body;

    if (typeof content !== 'string' || content.trim().length === 0 || content.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    // Check if post exists
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    if (!(await canViewPost(req.user, post)).allowed) return res.status(403).json({ success: false, message: 'Post access denied' });

    // Create comment
    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findOne({ _id: parentCommentId, post: post._id, isDeleted: false });
      if (!parentComment) return res.status(400).json({ success: false, message: 'Invalid parent comment' });
    }
    const comment = await withProgressionOutbox(async ({ session, enqueue }) => {
      const [created] = await Comment.create([{ author: req.user._id, post: post._id, text: content.trim(), parentComment: parentCommentId || null }], { session });
      await Post.updateOne({ _id: post._id }, { $inc: { 'stats.comments': 1 } }, { session });
      if (parentComment) await Comment.updateOne({ _id: parentComment._id }, { $addToSet: { replies: created._id } }, { session });
      const beneficiaryId = parentComment?.author || post.author;
      await enqueue({ principal: 'social', eventType: 'engagement.received', activityClass: 'ENGAGE',
        actorId: req.user._id, beneficiaryId, occurredAt: created.createdAt, subject: { type: 'user', id: String(beneficiaryId) }, object: { type: 'comment', id: String(created._id) },
        source: { objectType: 'comment', objectId: created._id, transition: 'created', version: '1' } });
      return created;
    });

    await comment.populate('author', 'username displayName avatar isVerified');

    // If it's a reply, add to parent comment
    if (parentCommentId) {
      if (parentComment) {
        // Notify parent comment author
        if (parentComment.author.toString() !== req.user._id.toString()) {
          await createNotification(parentComment.author, req.user._id, 'reply', {
            post: post._id, comment: comment._id,
            message: `${req.user.displayName || req.user.username} replied to your comment`
          });
        }
      }
    } else {
      // Notify post author of new comment
      if (post.author.toString() !== req.user._id.toString()) {
        await createNotification(post.author, req.user._id, 'comment', {
          post: post._id, comment: comment._id,
          message: `${req.user.displayName || req.user.username} commented on your post`
        });
      }
    }

    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/comments/:id
// @desc    Update a comment
// @access  Private
router.put('/comments/:id', protect, async (req, res) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string' || !content.trim() || content.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Valid comment content is required' });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check ownership
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }

    comment.text = content.trim();
    comment.isEdited = true;
    await comment.save();

    await comment.populate('author', 'username displayName avatar isVerified');

    res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/comments/:id
// @desc    Delete a comment
// @access  Private
router.delete('/comments/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check ownership or admin
    const administrativeOverride = comment.author.toString() !== req.user._id.toString();
    if (administrativeOverride && !await hasPlatformRole(req.user, 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    // Soft delete
    comment.isDeleted = true;
    comment.text = '[deleted]';
    await comment.save();
    if (administrativeOverride) await auditPlatformAction(req.user, 'delete_comment', { targetType: 'comment', targetId: comment._id });

    // Update post comment count
    const post = await Post.findById(comment.post);
    if (post) {
      post.stats.comments = Math.max(0, post.stats.comments - 1);
      await post.save();
    }

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/comments/:id/like
// @desc    Like/unlike a comment
// @access  Private
router.post('/comments/:id/like', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid comment ID' });
    }
    let comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const isLiked = comment.likes.some(id => id.toString() === req.user._id.toString());
    comment = await withProgressionOutbox(async ({ session, enqueue }) => {
      const current = await Comment.findById(req.params.id).session(session);
      const currentlyLiked = current.likes.some(id => id.toString() === req.user._id.toString());
      if (currentlyLiked) { current.likes = current.likes.filter(id => id.toString() !== req.user._id.toString()); current.likesCount = Math.max(0, current.likesCount - 1); }
      else { current.likes.push(req.user._id); current.likesCount += 1; }
      await current.save({ session });
      const transition = currentlyLiked ? 'unliked' : 'liked';
      if (!currentlyLiked) await enqueue({ principal: 'social', eventType: 'engagement.received', activityClass: 'ENGAGE', actorId: req.user._id, beneficiaryId: current.author,
        occurredAt: current.updatedAt, subject: { type: 'user', id: String(current.author) }, object: { type: 'comment', id: String(current._id) },
        source: { objectType: 'comment_reaction', objectId: `${current._id}:${req.user._id}`, transition, version: String(current.__v) } });
      return current;
    });

    res.json({
      success: true,
      isLiked: !isLiked,
      likes: comment.likesCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
