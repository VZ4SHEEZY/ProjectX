const Block = require('../models/Block');
const Follow = require('../models/Follow');
const Friendship = require('../models/Friendship');
const User = require('../models/User');

const id = value => value?._id?.toString?.() || value?.toString?.() || '';
const orderedPair = (a, b) => id(a) < id(b) ? [a, b] : [b, a];

async function isBlockedEitherWay(a, b) {
  if (!a || !b) return false;
  if (await Block.exists({ $or: [{ blocker: a, blocked: b }, { blocker: b, blocked: a }] })) return true;
  return Boolean(await User.exists({
    $or: [{ _id: a, blockedUsers: b }, { _id: b, blockedUsers: a }]
  }));
}

async function isFollowing(follower, followed) {
  if (!follower || !followed) return false;
  if (await Follow.exists({ follower, followed })) return true;
  return Boolean(await User.exists({ _id: follower, following: followed }));
}

async function areFriends(a, b) {
  if (!a || !b) return false;
  const [userLow, userHigh] = orderedPair(a, b);
  return Boolean(await Friendship.exists({ userLow, userHigh }));
}

async function canDirectMessage(sender, recipient) {
  if (!sender || !recipient || id(sender) === id(recipient)) return { allowed: false, reason: 'invalid_recipient' };
  if (await isBlockedEitherWay(sender, recipient)) return { allowed: false, reason: 'blocked' };
  const target = recipient.allowDMs === undefined ? await User.findById(recipient).select('allowDMs').lean() : recipient;
  if (target?.allowDMs === false) return { allowed: false, reason: 'dms_disabled' };
  return { allowed: true };
}

module.exports = { id, orderedPair, isBlockedEitherWay, isFollowing, areFriends, canDirectMessage };
