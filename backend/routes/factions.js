'use strict';

const express = require('express');
const Faction = require('../models/Faction');
const FactionMembership = require('../models/FactionMembership');
const ProgressionProjection = require('../models/ProgressionProjection');
const Post = require('../models/Post');
const Announcement = require('../models/Announcement');
const { optionalAuth } = require('../middleware/auth');
const { publicUserProjection, canViewPost, canViewProfile } = require('../services/accessPolicy');
const { findIdentity } = require('../services/factionCatalog');

const router = express.Router();
const safeMemberFields = 'isActive showOnlineStatus username displayName avatar isVerified isCreator faction profilePrivacy isPrivate followersCount';

async function factionSummary(faction, viewer) {
  const [memberCount, projection, membership] = await Promise.all([
    FactionMembership.countDocuments({ faction: faction._id, status: 'active' }),
    ProgressionProjection.findOne({ scope: 'faction', subjectId: faction.key }).select('+checkpoint').sort({ rebuiltAt: -1 }).lean(),
    viewer ? FactionMembership.findOne({ user: viewer._id, status: 'active' }).populate('faction', 'key name').lean() : null
  ]);
  const identity = findIdentity(faction);
  return {
    key: faction.key, name: faction.name, color: faction.color && faction.color !== '#39FF14' ? faction.color : identity.color,
    tagline: identity.tagline, description: identity.description, motto: identity.motto,
    founding: faction.founding, memberCount,
    progression: projection?.checkpoint ? { state: 'available', total: Math.floor((Number(projection.checkpoint.total) || 0) * 100) / 100, updatedAt: projection.rebuiltAt } : { state: 'unavailable' },
    relationship: !viewer ? 'visitor' : membership?.faction?.key === faction.key ? 'member' : membership ? 'other_faction' : 'unaffiliated'
  };
}

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const factions = await Faction.find({ status: 'active' }).sort({ founding: -1, name: 1 }).lean();
    res.json({ success: true, data: await Promise.all(factions.map(faction => factionSummary(faction, req.user))) });
  } catch (error) { next(error); }
});

router.get('/:key', optionalAuth, async (req, res, next) => {
  try {
    const faction = await Faction.findOne({ key: req.params.key, status: 'active' }).lean();
    if (!faction) return res.status(404).json({ success: false, message: 'Faction not found' });
    const summary = await factionSummary(faction, req.user);
    const [memberships, candidates, announcements] = await Promise.all([
      FactionMembership.find({ faction: faction._id, status: 'active' }).sort({ joinedAt: -1 }).limit(24).populate('user', safeMemberFields).lean(),
      Post.find({ faction: faction.name, status: 'published' }).sort({ createdAt: -1, _id: -1 }).limit(24).populate('author', safeMemberFields),
      Announcement.find({ isActive: true, $or: [{ targetType: 'all' }, ...(req.user?.faction === faction.name ? [{ targetType: 'faction', targetFaction: faction.name }] : [])] }).sort({ createdAt: -1 }).limit(8).select('title message mediaUrl createdAt targetType').lean()
    ]);
    const activity = [];
    for (const post of candidates) if (post.author && post.author.isActive !== false && (await canViewPost(req.user, post, post.author)).allowed) {
      const value = post.toObject();
      const publicFields = ['_id', 'type', 'title', 'content', 'description', 'mediaUrl', 'thumbnailUrl', 'createdAt'];
      activity.push({ ...Object.fromEntries(publicFields.filter(key => value[key] !== undefined).map(key => [key, value[key]])), author: publicUserProjection(value.author) });
    }
    const members = [];
    for (const item of memberships) if (item.user && item.user.isActive !== false && (await canViewProfile(req.user, item.user)).allowed) members.push(publicUserProjection(item.user));
    res.json({ success: true, data: { ...summary, members, activity: activity.slice(0, 12), announcements } });
  } catch (error) { next(error); }
});

module.exports = router;
