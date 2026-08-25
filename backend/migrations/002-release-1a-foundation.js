/*
 * Additive Release 1A backfill. Dry-run is the default; pass --apply explicitly.
 * This script never removes legacy User fields and intentionally creates no TopFriend records.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const Profile = require('../models/Profile');
const ProfileLayout = require('../models/ProfileLayout');
const ProfileModule = require('../models/ProfileModule');
const Faction = require('../models/Faction');
const FactionMembership = require('../models/FactionMembership');
const Creator = require('../models/Creator');
const AccountCapability = require('../models/AccountCapability');

const apply = process.argv.includes('--apply');
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({}).lean();
  const report = { mode: apply ? 'apply' : 'dry-run', users: users.length, profiles: 0, follows: 0, blocks: 0, factions: 0, memberships: 0, creators: 0, topFriends: 0 };
  const factionNames = [...new Set(users.map(user => user.faction).filter(name => name && name !== 'Unaffiliated'))];
  report.factions = factionNames.length;
  for (const name of factionNames) if (apply) await Faction.updateOne({ name }, { $setOnInsert: { key: slug(name), name, founding: true }, $set: { status: 'active' } }, { upsert: true });
  for (const user of users) {
    report.profiles += 1; report.follows += new Set((user.following || []).map(String)).size; report.blocks += new Set((user.blockedUsers || []).map(String)).size;
    if (user.faction && user.faction !== 'Unaffiliated') report.memberships += 1;
    if (user.isCreator || user.creatorStatus === 'pending' || user.creatorStatus === 'approved') report.creators += 1;
    if (!apply) continue;
    const profile = await Profile.findOneAndUpdate({ user: user._id }, { $setOnInsert: { user: user._id, source: 'legacy_backfill' }, $set: { displayName: user.displayName || '', bio: user.bio || '', avatar: user.avatar || '', banner: user.banner || '', locationLabel: user.location || '', website: user.website || '', socialLinks: user.socialLinks || {}, privacy: user.profilePrivacy === 'private' || user.isPrivate ? 'private' : 'public' } }, { upsert: true, new: true });
    await ProfileLayout.updateOne({ profile: profile._id }, { $setOnInsert: { profile: profile._id, theme: { ...(user.theme || {}), customCss: undefined }, factionStarterTheme: 'partial', version: 1 } }, { upsert: true });
    if (!await ProfileModule.exists({ profile: profile._id })) await ProfileModule.insertMany(['identity','bio','faction','top_friends','posts','media','links'].map((type, position) => ({ profile: profile._id, type, position, enabled: true, config: {}, schemaVersion: 1 })));
    for (const followed of new Set((user.following || []).map(String))) if (followed !== user._id.toString()) await Follow.updateOne({ follower: user._id, followed }, { $setOnInsert: { source: 'legacy_backfill' } }, { upsert: true });
    for (const blocked of new Set((user.blockedUsers || []).map(String))) if (blocked !== user._id.toString()) await Block.updateOne({ blocker: user._id, blocked }, { $setOnInsert: { source: 'legacy_backfill' } }, { upsert: true });
    if (user.faction && user.faction !== 'Unaffiliated') { const faction = await Faction.findOne({ name: user.faction }); await FactionMembership.updateOne({ user: user._id, status: 'active' }, { $setOnInsert: { faction: faction._id, source: 'legacy_backfill', joinedAt: user.createdAt || new Date() } }, { upsert: true }); }
    if (user.isCreator || ['pending','approved'].includes(user.creatorStatus)) { const state = user.isCreator || user.creatorStatus === 'approved' ? 'active' : 'pending'; await Creator.updateOne({ user: user._id }, { $setOnInsert: { source: 'legacy_backfill' }, $set: { state, applicationDate: user.creatorApplicationDate, approvedDate: user.creatorApprovedDate } }, { upsert: true }); await AccountCapability.updateOne({ user: user._id, capability: 'creator_mode' }, { $set: { state: state === 'active' ? 'enabled' : 'pending' } }, { upsert: true }); }
  }
  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
