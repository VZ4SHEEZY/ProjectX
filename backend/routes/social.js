const express = require('express');
const mongoose = require('mongoose');
const { protect, optionalAuth } = require('../middleware/auth');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const Mute = require('../models/Mute');
const FriendRequest = require('../models/FriendRequest');
const Friendship = require('../models/Friendship');
const TopFriend = require('../models/TopFriend');
const { orderedPair, isBlockedEitherWay } = require('../services/relationshipPolicy');
const { publicUserProjection, canViewProfile } = require('../services/accessPolicy');

const router = express.Router();
const validOther = (req, res) => mongoose.isValidObjectId(req.params.userId) && req.params.userId !== req.user._id.toString() || (res.status(400).json({ success: false, message: 'Invalid user' }), false);

router.post('/friends/requests/:userId', protect, async (req, res) => {
  if (!validOther(req, res)) return;
  if (!await User.exists({ _id: req.params.userId, isActive: { $ne: false } })) return res.status(404).json({ success: false, message: 'User not found' });
  if (await isBlockedEitherWay(req.user._id, req.params.userId)) return res.status(403).json({ success: false, message: 'Relationship unavailable' });
  const [userLow, userHigh] = orderedPair(req.user._id, req.params.userId);
  if (await Friendship.exists({ userLow, userHigh })) return res.status(409).json({ success: false, message: 'Already friends' });
  const inverse = await FriendRequest.findOne({ requester: req.params.userId, recipient: req.user._id, status: 'pending' });
  if (inverse) return res.status(409).json({ success: false, code: 'INCOMING_REQUEST_EXISTS', message: 'Accept the existing request' });
  const request = await FriendRequest.findOneAndUpdate(
    { requester: req.user._id, recipient: req.params.userId, status: 'pending' },
    { $setOnInsert: { requester: req.user._id, recipient: req.params.userId, status: 'pending' } },
    { upsert: true, new: true }
  );
  res.status(201).json({ success: true, data: request });
});

router.patch('/friends/requests/:requestId', protect, async (req, res) => {
  if (!['accepted','declined'].includes(req.body?.status)) return res.status(400).json({ success: false, message: 'Status must be accepted or declined' });
  const request = await FriendRequest.findOne({ _id: req.params.requestId, recipient: req.user._id, status: 'pending' });
  if (!request) return res.status(404).json({ success: false, message: 'Friend request not found' });
  if (await isBlockedEitherWay(request.requester, request.recipient)) return res.status(403).json({ success: false, message: 'Relationship unavailable' });
  request.status = req.body.status; request.respondedAt = new Date(); await request.save();
  if (request.status === 'accepted') {
    const [userLow, userHigh] = orderedPair(request.requester, request.recipient);
    await Friendship.updateOne({ userLow, userHigh }, { $setOnInsert: { acceptedRequest: request._id } }, { upsert: true });
  }
  res.json({ success: true, data: request });
});

router.delete('/friends/:userId', protect, async (req, res) => {
  if (!validOther(req, res)) return;
  const [userLow, userHigh] = orderedPair(req.user._id, req.params.userId);
  await Friendship.deleteOne({ userLow, userHigh });
  await TopFriend.deleteMany({ $or: [{ owner: req.user._id, friend: req.params.userId }, { owner: req.params.userId, friend: req.user._id }] });
  res.json({ success: true });
});

router.get('/friends', protect, async (req, res) => {
  const friendships = await Friendship.find({ $or: [{ userLow: req.user._id }, { userHigh: req.user._id }] }).populate('userLow userHigh', 'username displayName avatar isVerified isCreator').lean();
  res.json({ success: true, data: friendships.map(item => publicUserProjection(item.userLow._id.toString() === req.user._id.toString() ? item.userHigh : item.userLow)) });
});

router.put('/top-friends', protect, async (req, res) => {
  const ids = req.body?.friendIds;
  if (!Array.isArray(ids) || ids.length > 8 || new Set(ids).size !== ids.length || ids.some(value => !mongoose.isValidObjectId(value))) return res.status(400).json({ success: false, message: 'friendIds must contain up to 8 unique user IDs' });
  for (const friendId of ids) {
    const [userLow, userHigh] = orderedPair(req.user._id, friendId);
    if (!await Friendship.exists({ userLow, userHigh })) return res.status(400).json({ success: false, message: 'Top Friends must be accepted friends' });
  }
  await TopFriend.deleteMany({ owner: req.user._id });
  if (ids.length) await TopFriend.insertMany(ids.map((friend, position) => ({ owner: req.user._id, friend, position })));
  res.json({ success: true, data: ids.map((friend, position) => ({ friend, position })) });
});

router.get('/top-friends/:userId', optionalAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ success: false, message: 'Invalid user' });
  const owner = await User.findById(req.params.userId).select('_id profilePrivacy isPrivate faction');
  if (!owner) return res.status(404).json({ success: false, message: 'User not found' });
  if (!(await canViewProfile(req.user, owner)).allowed) return res.status(403).json({ success: false, message: 'Profile access denied' });
  const entries = await TopFriend.find({ owner: req.params.userId }).sort('position').populate('friend', 'username displayName avatar isVerified isCreator').lean();
  res.json({ success: true, data: entries.map(item => ({ position: item.position, friend: publicUserProjection(item.friend) })) });
});

router.put('/blocks/:userId', protect, async (req, res) => {
  if (!validOther(req, res)) return;
  const other = req.params.userId;
  await Block.updateOne({ blocker: req.user._id, blocked: other }, { $setOnInsert: { source: 'native' } }, { upsert: true });
  await User.updateOne({ _id: req.user._id }, { $addToSet: { blockedUsers: other } });
  await Follow.deleteMany({ $or: [{ follower: req.user._id, followed: other }, { follower: other, followed: req.user._id }] });
  await User.updateOne({ _id: req.user._id }, { $pull: { followers: other, following: other } });
  await User.updateOne({ _id: other }, { $pull: { followers: req.user._id, following: req.user._id } });
  await User.updateOne({ _id: req.user._id }, [{ $set: { followersCount: { $size: { $ifNull: ['$followers', []] } }, followingCount: { $size: { $ifNull: ['$following', []] } } } }]);
  await User.updateOne({ _id: other }, [{ $set: { followersCount: { $size: { $ifNull: ['$followers', []] } }, followingCount: { $size: { $ifNull: ['$following', []] } } } }]);
  const [userLow, userHigh] = orderedPair(req.user._id, other);
  await Friendship.deleteOne({ userLow, userHigh });
  await FriendRequest.updateMany({ $or: [{ requester: req.user._id, recipient: other }, { requester: other, recipient: req.user._id }], status: 'pending' }, { status: 'cancelled', respondedAt: new Date() });
  await TopFriend.deleteMany({ $or: [{ owner: req.user._id, friend: other }, { owner: other, friend: req.user._id }] });
  res.json({ success: true });
});

router.delete('/blocks/:userId', protect, async (req, res) => {
  await Block.deleteOne({ blocker: req.user._id, blocked: req.params.userId });
  await User.updateOne({ _id: req.user._id }, { $pull: { blockedUsers: req.params.userId } });
  res.json({ success: true });
});

router.put('/mutes/:userId', protect, async (req, res) => {
  if (!validOther(req, res)) return;
  await Mute.updateOne({ muter: req.user._id, muted: req.params.userId }, { $setOnInsert: {} }, { upsert: true });
  res.json({ success: true });
});

router.delete('/mutes/:userId', protect, async (req, res) => {
  await Mute.deleteOne({ muter: req.user._id, muted: req.params.userId });
  res.json({ success: true });
});

for (const layer of router.stack) for (const handler of layer.route?.stack || []) {
  const routeHandler = handler.handle;
  if (routeHandler.constructor.name === 'AsyncFunction') handler.handle = (req, res, next) => Promise.resolve(routeHandler(req, res, next)).catch(next);
}

module.exports = router;
