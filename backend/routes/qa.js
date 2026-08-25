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
const AccessRule = require('../models/AccessRule');
const Faction = require('../models/Faction');

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
    ,AccessRule.deleteMany({ owner: { $in: ids } })
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

  const factionNames = [
    'Neon Wraith', 'Iron Veil', 'Crimson Static', 'Void Circuit', 'Gold Syndicate',
    'Azure Phantom', 'Toxic Bloom', 'Scarlet Dominion', 'Chrome Legion', 'Phantom Signal',
    'Obsidian Pact', 'Ember Protocol', 'Violet Surge', 'Steel Covenant', 'Binary Ghost',
    'Copper Throne', 'Nova Rift', 'Silver Wraith', 'Inferno Grid', 'Quantum Veil'
  ];
  const factionDocs = new Map();
  for (const name of factionNames) {
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const faction = await Faction.findOneAndUpdate(
      { key }, { $set: { name, status: 'active', founding: true } }, { upsert: true, new: true }
    );
    factionDocs.set(name, faction);
  }
  const certificationUsers = [];
  const createCertificationUser = async (slug, factionName, fields = {}) => {
    const user = await makeUser(slug, { faction: factionName, ...fields });
    const profile = await Profile.create({
      user: user._id,
      displayName: fields.displayName || user.displayName,
      bio: fields.bio || `A real disposable ${factionName} profile built for Release 2 visual certification.`,
      avatar: user.avatar,
      banner: `https://picsum.photos/seed/${runId}-${slug}-banner/1400/440`,
      locationLabel: fields.locationLabel || 'The CyberDope network',
      website: 'https://example.com',
      socialLinks: { instagram: 'https://example.com/instagram' },
      privacy: 'public', source: 'native'
    });
    await ProfileLayout.create({ profile: profile._id, factionStarterTheme: 'full', theme: fields.theme || {} });
    await FactionMembership.create({ user: user._id, faction: factionDocs.get(factionName)._id, status: 'active', source: 'native' });
    certificationUsers.push({ user, profile, factionName, role: slug });
    return { user, profile };
  };
  const commonModules = (profile, creatorMode = false) => {
    const types = creatorMode
      ? ['identity', 'creator_summary', 'bio', 'faction', 'top_friends', 'posts', 'media', 'links']
      : ['identity', 'bio', 'faction', 'top_friends', 'posts', 'media', 'links'];
    return types.map((type, position) => ({
      profile: profile._id, type, position, enabled: true,
      config: type === 'identity' ? { tagline: 'Personal signal. Faction roots. No templates.' }
        : type === 'bio' ? { text: 'Art, technology, friendship, and strange futures—assembled here as a personal signal rather than a template.' }
          : type === 'media' ? { limit: 6 }
            : type === 'creator_summary' ? { heading: 'Worlds, motion, and midnight transmissions', description: 'Original visual work, selected releases, and the process behind this creator signal.' }
              : {}
    }));
  };
  const seedPosts = async (user, factionName, count = 6) => {
    const posts = Array.from({ length: count }, (_, index) => ({
      author: user._id, type: index < 4 ? 'image' : 'text', status: 'published', visibility: 'public',
      title: `${factionName} study ${index + 1}`,
      description: `Transmission ${index + 1} from ${user.displayName}`,
      content: `Transmission ${index + 1} from ${user.displayName}`,
      mediaUrl: index < 4 ? `https://picsum.photos/seed/${runId}-${user.username}-${index}/720/720` : '',
      thumbnailUrl: index < 4 ? `https://picsum.photos/seed/${runId}-${user.username}-${index}/720/720` : '',
      faction: factionName
    }));
    await Post.insertMany(posts);
  };

  const factionProfiles = [];
  for (const [index, factionName] of factionNames.entries()) {
    const slug = `faction${String(index + 1).padStart(2, '0')}`;
    const entry = await createCertificationUser(slug, factionName, { displayName: `${factionName} Signal` });
    await ProfileModule.insertMany(commonModules(entry.profile));
    await seedPosts(entry.user, factionName, 4);
    factionProfiles.push({ username: entry.user.username, faction: factionName, id: entry.user._id.toString() });
  }

  const individuality = [
    { slug: 'obsidian_a', displayName: 'Velvet Hex', theme: { primaryColor: '#ff4f9a', secondaryColor: '#7d245f', accentColor: '#ffd2e8', backgroundColor: '#170516', fontFamily: 'serif', fontSize: 'large', layoutStyle: 'single', borderStyle: 'double', borderRadius: 'large', spacing: 'spacious', glowEffects: false, scanlines: false, effectIntensity: 'off', backgroundImage: `https://picsum.photos/seed/${runId}-velvet-bg/1800/1200` }, influence: 'off', order: ['identity','bio','media','top_friends','posts','faction','links'] },
    { slug: 'obsidian_b', displayName: 'Null Architect', theme: { primaryColor: '#62ffe5', secondaryColor: '#2850ff', accentColor: '#d4fff9', backgroundColor: '#020b13', fontFamily: 'mono', fontSize: 'small', layoutStyle: 'masonry', borderStyle: 'minimal', borderRadius: 'none', spacing: 'compact', glowEffects: true, scanlines: true, effectIntensity: 'medium', backgroundImage: '' }, influence: 'partial', order: ['identity','faction','links','media','posts','bio','top_friends'] },
    { slug: 'obsidian_c', displayName: 'Nocturne Bloom', theme: { primaryColor: '#d6b6ff', secondaryColor: '#4a2068', accentColor: '#ffbc55', backgroundColor: '#08040d', fontFamily: 'display', fontSize: 'medium', layoutStyle: 'sidebar-left', borderStyle: 'glow', borderRadius: 'medium', spacing: 'comfortable', glowEffects: true, scanlines: false, effectIntensity: 'low', backgroundImage: `https://picsum.photos/seed/${runId}-nocturne-bg/1800/1200` }, influence: 'full', order: ['identity','top_friends','faction','bio','posts','media','links'] }
  ];
  const individualityProfiles = [];
  for (const item of individuality) {
    const entry = await createCertificationUser(item.slug, 'Obsidian Pact', { displayName: item.displayName, theme: item.theme });
    await ProfileLayout.updateOne({ profile: entry.profile._id }, { $set: { factionStarterTheme: item.influence } });
    const moduleMap = new Map(commonModules(entry.profile).map(module => [module.type, module]));
    await ProfileModule.insertMany(item.order.map((type, position) => ({ ...moduleMap.get(type), position })));
    await seedPosts(entry.user, 'Obsidian Pact');
    individualityProfiles.push({ username: entry.user.username, id: entry.user._id.toString(), influence: item.influence });
  }

  const creatorEntry = await createCertificationUser('cert_creator', 'Nova Rift', {
    displayName: 'Nova Vale — Creator', isCreator: true, creatorStatus: 'approved', isCreatorVerified: true,
    bio: 'Visual storyteller building luminous worlds from motion, portraiture, and sound.'
  });
  await Creator.create({ user: creatorEntry.user._id, state: 'active', approvedDate: new Date(), source: 'native' });
  await AccountCapability.create({ user: creatorEntry.user._id, capability: 'creator_mode', state: 'enabled', activatedAt: new Date() });
  await ProfileModule.insertMany(commonModules(creatorEntry.profile, true));
  await seedPosts(creatorEntry.user, 'Nova Rift', 7);

  const accessEntry = await createCertificationUser('access', 'Binary Ghost', { displayName: 'Cipher Gate' });
  const hiddenRule = await AccessRule.create({ owner: accessEntry.user._id, name: 'Hidden subscribers', expression: { op: 'predicate', type: 'subscribers' }, presentation: 'hidden' });
  const andRule = await AccessRule.create({ owner: accessEntry.user._id, name: 'Verified AND subscriber', expression: { op: 'and', children: [{ op: 'predicate', type: 'age_verified' }, { op: 'predicate', type: 'subscribers' }] }, presentation: 'locked_preview' });
  const orRule = await AccessRule.create({ owner: accessEntry.user._id, name: 'Friend OR subscriber', expression: { op: 'or', children: [{ op: 'predicate', type: 'friends' }, { op: 'predicate', type: 'subscribers' }] }, presentation: 'locked_preview' });
  const accessModules = commonModules(accessEntry.profile);
  accessModules.splice(3, 0,
    { profile: accessEntry.profile._id, type: 'media', enabled: true, config: { limit: 6, restrictedCaption: 'MUST_NOT_LEAK' }, accessRule: hiddenRule._id },
    { profile: accessEntry.profile._id, type: 'media', enabled: true, config: { limit: 6, restrictedCaption: 'AND_SECRET_MUST_NOT_LEAK' }, accessRule: andRule._id },
    { profile: accessEntry.profile._id, type: 'links', enabled: true, config: { restrictedUrl: 'https://secret.invalid/private' }, accessRule: orRule._id }
  );
  await ProfileModule.insertMany(accessModules.map((module, position) => ({ ...module, position })));
  await seedPosts(accessEntry.user, 'Binary Ghost');

  const friendFactionNames = ['Neon Wraith','Iron Veil','Crimson Static','Void Circuit','Gold Syndicate','Azure Phantom','Toxic Bloom','Nova Rift'];
  const friendEntries = [];
  for (const [index, factionName] of friendFactionNames.entries()) {
    const entry = await createCertificationUser(`friend${index + 1}`, factionName, { displayName: ['Muse','Heretic','Nyx','Rook','Vega','Zero','Echo','Iris'][index] });
    await ProfileModule.insertMany(commonModules(entry.profile));
    friendEntries.push(entry);
  }
  for (const owner of [individualityProfiles[0], creatorEntry.user]) {
    const ownerId = owner.id || owner._id;
    for (const friend of friendEntries) {
      const pair = [ownerId.toString(), friend.user._id.toString()].sort();
      await Friendship.create({ userLow: pair[0], userHigh: pair[1] });
    }
    await TopFriend.insertMany([...friendEntries].reverse().map((friend, position) => ({ owner: ownerId, friend: friend.user._id, position })));
  }

  res.status(201).json({ runId, password, users: [primary, peer, creator].map(user => ({
    id: user._id.toString(), role: user.username.split('_').at(-1), username: user.username, email: user.email
  })), postId: post._id.toString(), certification: {
    factionProfiles, individualityProfiles,
    creator: { username: creatorEntry.user.username, id: creatorEntry.user._id.toString() },
    access: { username: accessEntry.user.username, id: accessEntry.user._id.toString(), ruleIds: { hidden: hiddenRule._id.toString(), and: andRule._id.toString(), or: orRule._id.toString() } },
    topFriendsOwner: individualityProfiles[0],
    friendIds: friendEntries.map(entry => entry.user._id.toString())
  } });
});

router.delete('/accounts/:runId', async (req, res) => {
  const runId = String(req.params.runId || '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
  res.json({ success: true, deletedUsers: await removeQaData(runId) });
});

module.exports = router;
