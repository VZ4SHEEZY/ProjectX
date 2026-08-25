/* Read-only Release 1 reconciliation. This script never writes, even with extra flags. */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');
const ProfileLayout = require('../models/ProfileLayout');
const ProfileModule = require('../models/ProfileModule');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const TopFriend = require('../models/TopFriend');
const Friendship = require('../models/Friendship');
const Faction = require('../models/Faction');
const FactionMembership = require('../models/FactionMembership');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({}).select('following blockedUsers faction').lean();
  const ids = users.map(user => user._id);
  const [profiles, layouts, modules, follows, blocks, topFriends, friendships, factions, memberships] = await Promise.all([
    Profile.find({ user: { $in: ids } }).lean(), ProfileLayout.countDocuments(), ProfileModule.countDocuments(), Follow.find({}).lean(), Block.find({}).lean(), TopFriend.find({}).lean(), Friendship.find({}).lean(), Faction.find({ founding: true }).lean(), FactionMembership.find({ status: 'active' }).lean()
  ]);
  const profileUsers = new Set(profiles.map(item => String(item.user)));
  const normalizedFollows = new Set(follows.map(item => `${item.follower}:${item.followed}`));
  const normalizedBlocks = new Set(blocks.map(item => `${item.blocker}:${item.blocked}`));
  const activeMembershipUsers = new Set(memberships.map(item => String(item.user)));
  const friendshipPairs = new Set(friendships.map(item => `${item.userLow}:${item.userHigh}`));
  const report = {
    mode: 'read-only-reconciliation', users: users.length, profiles: profiles.length, layouts, modules, foundingFactions: factions.length,
    missingProfiles: users.filter(user => !profileUsers.has(String(user._id))).length,
    missingActiveFactionMemberships: users.filter(user => user.faction && user.faction !== 'Unaffiliated' && !activeMembershipUsers.has(String(user._id))).length,
    legacyFollowsMissingNormalized: users.flatMap(user => (user.following || []).map(target => `${user._id}:${target}`)).filter(key => !normalizedFollows.has(key)).length,
    legacyBlocksMissingNormalized: users.flatMap(user => (user.blockedUsers || []).map(target => `${user._id}:${target}`)).filter(key => !normalizedBlocks.has(key)).length,
    invalidTopFriends: topFriends.filter(item => { const pair = [String(item.owner), String(item.friend)].sort(); return !friendshipPairs.has(`${pair[0]}:${pair[1]}`); }).length,
    duplicateTopFriendPositions: topFriends.length - new Set(topFriends.map(item => `${item.owner}:${item.position}`)).size,
    topFriends: topFriends.length
  };
  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
