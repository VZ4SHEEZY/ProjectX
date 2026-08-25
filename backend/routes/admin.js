const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');
const { requireAdmin, logAdminAction } = require('../middleware/admin');
const observability = require('../services/observability');

const router = express.Router();

// GET /api/admin/diagnostics - bounded, aggregate operational health (admin only)
router.get('/diagnostics', protect, requireAdmin, (req, res) => {
  res.json({ success: true, data: observability.diagnostics() });
});

// GET /api/admin/stats - platform totals and faction leaderboard (admin only)
router.get('/stats', protect, requireAdmin, logAdminAction('view_analytics'), async (req, res) => {
  try {
    const [totalUsers, postTotals, userFactions, postFactions] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Post.aggregate([
        { $match: { status: 'published' } },
        {
          $group: {
            _id: null,
            posts: { $sum: 1 },
            likes: {
              $sum: {
                $max: [
                  { $ifNull: ['$likesCount', 0] },
                  { $ifNull: ['$stats.likes', 0] },
                  { $size: { $ifNull: ['$likedBy', []] } },
                  { $size: { $ifNull: ['$likes', []] } }
                ]
              }
            }
          }
        }
      ]),
      User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: { $ifNull: ['$faction', 'Unaffiliated'] }, users: { $sum: 1 } } }
      ]),
      Post.aggregate([
        { $match: { status: 'published' } },
        { $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'authorData' } },
        { $unwind: { path: '$authorData', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: {
              $cond: [
                { $and: [{ $ne: ['$faction', null] }, { $ne: ['$faction', ''] }] },
                '$faction',
                { $ifNull: ['$authorData.faction', 'Unaffiliated'] }
              ]
            },
            posts: { $sum: 1 },
            likes: {
              $sum: {
                $max: [
                  { $ifNull: ['$likesCount', 0] },
                  { $ifNull: ['$stats.likes', 0] },
                  { $size: { $ifNull: ['$likedBy', []] } },
                  { $size: { $ifNull: ['$likes', []] } }
                ]
              }
            }
          }
        }
      ])
    ]);

    const factions = new Map();
    userFactions.forEach(({ _id, users }) => factions.set(_id, { name: _id, users, posts: 0, likes: 0 }));
    postFactions.forEach(({ _id, posts, likes }) => {
      const faction = factions.get(_id) || { name: _id, users: 0, posts: 0, likes: 0 };
      faction.posts = posts;
      faction.likes = likes;
      factions.set(_id, faction);
    });

    // Observational admin analytics only. These raw counts are explicitly not a
    // faction score and cannot be consumed as progression/allegiance/war input.
    const leaderboard = Array.from(factions.values())
      .map(faction => ({ ...faction, engagementSignals: faction.posts + faction.likes, trustedForProgression: false }))
      .sort((a, b) => b.users - a.users || a.name.localeCompare(b.name));

    await req.logAdminAction({ totals: { users: totalUsers, posts: postTotals[0]?.posts || 0 } });

    res.json({
      success: true,
      data: {
        totals: {
          users: totalUsers,
          posts: postTotals[0]?.posts || 0,
          likes: postTotals[0]?.likes || 0,
          activeFactions: userFactions.filter(faction => faction.users > 0).length
        },
        factions: leaderboard,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch platform statistics' });
  }
});

module.exports = router;
