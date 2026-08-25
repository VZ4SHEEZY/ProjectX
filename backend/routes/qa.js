const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const Mute = require('../models/Mute');
const FriendRequest = require('../models/FriendRequest');
const Friendship = require('../models/Friendship');
const TopFriend = require('../models/TopFriend');
const Profile = require('../models/Profile');
const ProfileLayout = require('../models/ProfileLayout');
const ProfileModule = require('../models/ProfileModule');
const FactionMembership = require('../models/FactionMembership');
const Creator = require('../models/Creator');
const AccountCapability = require('../models/AccountCapability');
const PlatformRole = require('../models/PlatformRole');
const ContentView = require('../models/ContentView');

const router = express.Router();

router.use((req, res, next) => {
  const expected = process.env.QA_E2E_SECRET;
  const supplied = req.get('x-qa-e2e-secret');
  if (!expected || !supplied || supplied.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return res.status(404).json({ error: 'Route not found' });
  }
  next();
});

async function removeQaData(runId) {
  const users = await User.find({ isQaAccount: true, ...(runId ? { username: new RegExp(`^qa_${runId}_`) } : {}) })
    .select('_id').lean();
  const ids = users.map(user => user._id);
  if (!ids.length) return 0;
  const posts = await Post.find({ author: { $in: ids } }).select('_id').lean();
  const postIds = posts.map(post => post._id);
  const profiles = await Profile.find({ user: { $in: ids } }).select('_id').lean();
  const profileIds = profiles.map(profile => profile._id);
  await Promise.all([
    Comment.deleteMany({ $or: [{ author: { $in: ids } }, { post: { $in: postIds } }] }),
    Message.deleteMany({ $or: [{ sender: { $in: ids } }, { recipient: { $in: ids } }] }),
    Notification.deleteMany({ $or: [{ recipient: { $in: ids } }, { actor: { $in: ids } }] }),
    Post.deleteMany({ _id: { $in: postIds } }),
    User.updateMany({}, { $pull: { followers: { $in: ids }, following: { $in: ids } } })
    ,Follow.deleteMany({ $or: [{ follower: { $in: ids } }, { followed: { $in: ids } }] })
    ,Block.deleteMany({ $or: [{ blocker: { $in: ids } }, { blocked: { $in: ids } }] })
    ,Mute.deleteMany({ $or: [{ muter: { $in: ids } }, { muted: { $in: ids } }] })
    ,FriendRequest.deleteMany({ $or: [{ requester: { $in: ids } }, { recipient: { $in: ids } }] })
    ,Friendship.deleteMany({ $or: [{ userLow: { $in: ids } }, { userHigh: { $in: ids } }] })
    ,TopFriend.deleteMany({ $or: [{ owner: { $in: ids } }, { friend: { $in: ids } }] })
    ,ProfileModule.deleteMany({ profile: { $in: profileIds } })
    ,ProfileLayout.deleteMany({ profile: { $in: profileIds } })
    ,Profile.deleteMany({ _id: { $in: profileIds } })
    ,FactionMembership.deleteMany({ user: { $in: ids } })
    ,Creator.deleteMany({ user: { $in: ids } })
    ,AccountCapability.deleteMany({ user: { $in: ids } })
    ,PlatformRole.deleteMany({ user: { $in: ids } })
    ,ContentView.deleteMany({ $or: [{ viewer: { $in: ids } }, { post: { $in: postIds } }] })
  ]);
  await User.deleteMany({ _id: { $in: ids }, isQaAccount: true });
  return ids.length;
}

router.post('/seed', async (req, res) => {
  const runId = String(req.body.runId || '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
  if (!runId) return res.status(400).json({ error: 'Valid runId required' });
  await removeQaData(runId);
  const password = crypto.randomBytes(18).toString('base64url');
  const makeUser = async (role, fields = {}) => User.create({
    username: `qa_${runId}_${role}`.toLowerCase(),
    email: `qa_${runId}_${role}@example.invalid`.toLowerCase(),
    password,
    displayName: `QA ${role}`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=qa-${runId}-${role}`,
    isAgeVerified: true,
    isQaAccount: true,
    ...fields
  });
  const [primary, peer, creator] = await Promise.all([
    makeUser('primary'), makeUser('peer'),
    makeUser('creator', { isCreator: true, creatorStatus: 'approved', isCreatorVerified: true })
  ]);
  const post = await Post.create({ author: creator._id, type: 'text', status: 'published', visibility: 'public', description: `QA seed ${runId}` });
  res.status(201).json({ runId, password, users: [primary, peer, creator].map(user => ({
    id: user._id.toString(), role: user.username.split('_').at(-1), username: user.username, email: user.email
  })), postId: post._id.toString() });
});

router.delete('/accounts/:runId', async (req, res) => {
  const runId = String(req.params.runId || '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
  res.json({ success: true, deletedUsers: await removeQaData(runId) });
});

module.exports = router;
