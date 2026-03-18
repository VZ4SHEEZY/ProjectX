const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// @route   GET /api/posts/:postId/comments
// @desc    Get all comments for a post
// @access  Public
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = '-createdAt' } = req.query;

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

    if (!content || content.trim().length === 0) {
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

    // Create comment
    const comment = await Comment.create({
      author: req.user._id,
      post: req.params.postId,
      content: content.trim(),
      parentComment: parentCommentId || null
    });

    await comment.populate('author', 'username displayName avatar isVerified');

    // Update post comment count
    post.stats.comments += 1;
    await post.save();

    // If it's a reply, add to parent comment
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (parentComment) {
        parentComment.replies.push(comment._id);
        await parentComment.save();

        // Notify parent comment author
        if (parentComment.author.toString() !== req.user._id.toString()) {
          await Notification.create({
            recipient: parentComment.author,
            sender: req.user._id,
            type: 'reply',
            post: post._id,
            comment: comment._id,
            message: `${req.user.displayName || req.user.username} replied to your comment`
          });
        }
      }
    } else {
      // Notify post author of new comment
      if (post.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: post.author,
          sender: req.user._id,
          type: 'comment',
          post: post._id,
          comment: comment._id,
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

    let comment = await Comment.findById(req.params.id);

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

    comment.content = content.trim();
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
    if (comment.author.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    // Soft delete
    comment.isDeleted = true;
    comment.content = '[deleted]';
    await comment.save();

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
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const isLiked = comment.likedBy.includes(req.user._id);

    if (isLiked) {
      // Unlike
      comment.likedBy = comment.likedBy.filter(
        id => id.toString() !== req.user._id.toString()
      );
      comment.likes = Math.max(0, comment.likes - 1);
    } else {
      // Like
      comment.likedBy.push(req.user._id);
      comment.likes += 1;
    }

    await comment.save();

    res.json({
      success: true,
      isLiked: !isLiked,
      likes: comment.likes
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
