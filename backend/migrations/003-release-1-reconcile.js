/* Strictly read-only Release 1 reconciliation: auto-create/index are disabled. */
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.set('autoIndex', false); mongoose.set('autoCreate', false);
const User = require('../models/User');
const Profile = require('../models/Profile');
const FollowRequest = require('../models/FollowRequest');
const Mute = require('../models/Mute');
const TopFriend = require('../models/TopFriend');
const Friendship = require('../models/Friendship');
const { FOUNDING_FACTIONS, buildPreflight, approvedDifferences } = require('./002-release-1a-foundation');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  try {
    const pre = await buildPreflight();
    const users = await User.find({}).select('faction profilePrivacy isPrivate following followers blockedUsers theme.customCss profileLayout isCreator creatorStatus').lean();
    const ids = new Set(users.map(user => String(user._id)));
    const [followRequests, mutes, topFriends, friendships, privateProfiles] = await Promise.all([
      FollowRequest.countDocuments(), Mute.countDocuments(), TopFriend.countDocuments(), Friendship.countDocuments(), Profile.countDocuments({ privacy: { $ne: 'public' } })
    ]);
    const factionCounts = Object.fromEntries(FOUNDING_FACTIONS.map(name => [name, users.filter(user => user.faction === name).length]));
    const unmappedFactions = users.filter(user => user.faction && user.faction !== 'Unaffiliated' && !FOUNDING_FACTIONS.includes(user.faction)).length;
    const missingFactions = users.filter(user => !user.faction).length;
    const legacyPrivate = users.filter(user => user.isPrivate === true).length;
    const duplicateLegacyReferences = users.reduce((sum, user) => sum + (user.following || []).length - new Set((user.following || []).map(String)).size, 0);
    const selfLegacyReferences = users.reduce((sum, user) => sum + (user.following || []).filter(target => String(target) === String(user._id)).length, 0);
    const danglingFollowerBackrefs = users.reduce((sum, user) => sum + (user.followers || []).filter(source => !ids.has(String(source))).length, 0);
    console.log(JSON.stringify({
      mode: 'read-only-reconciliation', productionWritesEnabled: false, ...pre.report,
      approvedDifferences: approvedDifferences(pre.report), legacyFollowReferences: users.reduce((sum, user) => sum + (user.following || []).length, 0), duplicateLegacyReferences, selfLegacyReferences, danglingFollowerBackrefs,
      followRequestsExisting: followRequests, mutesExisting: mutes, topFriendsExisting: topFriends, friendshipsExisting: friendships,
      privateProfileImplications: { legacyPrivateAccounts: legacyPrivate, normalizedNonPublicProfiles: privateProfiles, followRequestsRequiredAfterBackfill: legacyPrivate, existingFollowEdgesRemainAccepted: pre.report.validFollows },
      factionMapping: factionCounts, unaffiliatedUsers: users.filter(user => user.faction === 'Unaffiliated').length, unmappedFactions, missingFactions,
      relationshipsDroppedOrChanged: { rejectedDanglingFollows: pre.report.rejectedDanglingFollows, rejectedSelfFollows: pre.report.rejectedSelfFollows, duplicateEdgesCanonicalized: duplicateLegacyReferences, topFriendsExcluded: true },
      recordsThatWouldFailMigration: pre.report.rejectedDanglingFollows + pre.report.rejectedSelfFollows + unmappedFactions,
      legacyUsersModified: 0, fakeLegacyTopFriendsExcluded: true
    }, null, 2));
  } finally { await mongoose.disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
