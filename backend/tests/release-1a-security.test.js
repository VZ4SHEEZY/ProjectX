const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const Friendship = require('../models/Friendship');
const ContentView = require('../models/ContentView');
const { canViewPost, canViewProfile, evaluateAccessRules, evaluateAccessExpression, validateAccessExpression, publicUserProjection, privateVerificationProjection } = require('../services/accessPolicy');
const { validateProfileUpdate, validateLayoutUpdate, validateModuleConfig } = require('../services/profileValidation');

const ownerId = new mongoose.Types.ObjectId();
const viewerId = new mongoose.Types.ObjectId();
const original = { blockExists: Block.exists, followExists: Follow.exists, friendshipExists: Friendship.exists, userExists: User.exists };

test.beforeEach(() => {
  Block.exists = async () => null;
  Follow.exists = async () => null;
  Friendship.exists = async () => null;
  User.exists = async () => null;
});
test.after(() => Object.assign(Block, { exists: original.blockExists }) && Object.assign(Follow, { exists: original.followExists }) && Object.assign(Friendship, { exists: original.friendshipExists }) && Object.assign(User, { exists: original.userExists }));

test('public projections never expose age, verification dates, private theme code, or wallets', () => {
  const user = new User({ username: 'security-user', email: 'security@example.com', password: 'password', isAgeVerified: true, ageVerifiedAt: new Date(), embeddedWalletAddress: '0x123', theme: { customCss: 'body{display:none}', primaryColor: '#112233' } });
  const value = publicUserProjection(user);
  assert.equal(value.isAgeVerified, undefined);
  assert.equal(value.ageVerifiedAt, undefined);
  assert.equal(value.embeddedWalletAddress, undefined);
  assert.equal(value.theme.customCss, undefined);
  assert.equal(value.theme.primaryColor, '#112233');
  assert.equal(privateVerificationProjection(user).age.verified, true);
});

test('private profiles and blocks deny profile and post metadata server-side', async () => {
  const owner = { _id: ownerId, profilePrivacy: 'private', faction: 'Quantum Veil' };
  assert.equal((await canViewProfile({ _id: viewerId }, owner)).allowed, false);
  const post = new Post({ author: ownerId, type: 'image', visibility: 'public', mediaUrl: 'https://private.example/media.jpg' });
  assert.equal((await canViewPost({ _id: viewerId }, post, owner)).allowed, false);
  Block.exists = async () => ({ _id: new mongoose.Types.ObjectId() });
  assert.equal((await canViewProfile({ _id: viewerId }, { ...owner, profilePrivacy: 'public' })).reason, 'blocked');
});

test('subscriber, faction, and age gates fail closed without authoritative assertions', async () => {
  const owner = { _id: ownerId, profilePrivacy: 'public', faction: 'Quantum Veil' };
  const subscriberPost = new Post({ author: ownerId, type: 'video', visibility: 'subscribers' });
  assert.equal((await canViewPost({ _id: viewerId, faction: 'Quantum Veil' }, subscriberPost, owner)).reason, 'subscription_required');
  const factionPost = new Post({ author: ownerId, type: 'video', visibility: 'faction', faction: 'Quantum Veil' });
  assert.equal((await canViewPost({ _id: viewerId, faction: 'Iron Veil' }, factionPost, owner)).allowed, false);
  const adultPost = new Post({ author: ownerId, type: 'video', visibility: 'public', isNSFW: true });
  assert.equal((await canViewPost({ _id: viewerId }, adultPost, owner)).reason, 'age_verification_required');
});

test('access rules use server context with explicit deny precedence', () => {
  const context = { follows: true, friends: false, sameFaction: true, ageVerified: true, isOwner: false };
  assert.equal(evaluateAccessRules(context, [{ audience: 'followers', effect: 'allow' }]).allowed, true);
  assert.equal(evaluateAccessRules(context, [{ audience: 'everyone', effect: 'allow' }, { audience: 'same_faction', effect: 'deny' }]).allowed, false);
  assert.equal(evaluateAccessRules(context, [{ audience: 'subscribers', effect: 'allow' }]).allowed, false);
});

test('Release 1 access expressions support constrained AND and OR without executable policy code', () => {
  const context = { authenticated: true, follows: false, friends: true, sameFaction: true, ageVerified: false, isOwner: false };
  const friendOrSubscriber = { op: 'or', children: [{ op: 'predicate', type: 'friends' }, { op: 'predicate', type: 'subscribers' }] };
  const factionAndFriend = { op: 'and', children: [{ op: 'predicate', type: 'same_faction' }, { op: 'predicate', type: 'friends' }] };
  assert.equal(evaluateAccessExpression(context, friendOrSubscriber).allowed, true);
  assert.equal(evaluateAccessExpression(context, factionAndFriend).allowed, true);
  assert.equal(evaluateAccessExpression(context, { op: 'and', children: [{ op: 'predicate', type: 'age_verified' }, { op: 'predicate', type: 'subscribers' }] }).allowed, false);
  assert.equal(validateAccessExpression({ op: 'javascript', code: 'return true' }), false);
  assert.equal(validateAccessExpression({ op: 'predicate', type: 'unknown' }), false);
});

test('Release 1 profile privacy includes authenticated users, followers, friends, and owner-only', async () => {
  const viewer = { _id: viewerId };
  assert.equal((await canViewProfile(viewer, { _id: ownerId, profilePrivacy: 'users' })).allowed, true);
  assert.equal((await canViewProfile(null, { _id: ownerId, profilePrivacy: 'users' })).allowed, false);
  Follow.exists = async () => ({ _id: new mongoose.Types.ObjectId() });
  assert.equal((await canViewProfile(viewer, { _id: ownerId, profilePrivacy: 'followers' })).allowed, true);
  Follow.exists = async () => null; Friendship.exists = async () => ({ _id: new mongoose.Types.ObjectId() });
  assert.equal((await canViewProfile(viewer, { _id: ownerId, profilePrivacy: 'friends' })).allowed, true);
  assert.equal((await canViewProfile(viewer, { _id: ownerId, profilePrivacy: 'private' })).allowed, false);
});

test('profile contract rejects executable and unknown content while accepting validated theme tokens', () => {
  assert.match(validateProfileUpdate({ theme: { customCss: 'body{}' } }).error, /Unsupported theme fields/);
  assert.match(validateProfileUpdate({ customHtml: '<script>alert(1)</script>' }).error, /Unsupported profile fields/);
  assert.equal(validateProfileUpdate({ theme: { primaryColor: '#abcdef', animations: false } }).error, undefined);
  assert.match(validateProfileUpdate({ website: 'javascript:alert(1)' }).error, /http\(s\)/);
  assert.match(validateProfileUpdate({ faction: 'Iron Veil' }).error, /Unsupported profile fields/);
  assert.equal(validateProfileUpdate({ profilePrivacy: 'users', dmAudience: 'friends_subscribers', friendRequestAudience: 'followers' }).error, undefined);
});

test('Release 2 visual contracts accept approved tokens and reject executable or unbounded module configuration', () => {
  assert.equal(validateLayoutUpdate({ factionStarterTheme: 'partial', theme: { fontFamily: 'display', spacing: 'spacious', borderStyle: 'double', effectIntensity: 'low' } }).error, undefined);
  assert.match(validateLayoutUpdate({ theme: { fontFamily: 'Comic Sans MS' } }).error, /approved choice/);
  assert.match(validateLayoutUpdate({ theme: { customCss: '*{display:none}' } }).error, /Unsupported theme fields/);
  assert.equal(validateModuleConfig('identity', { tagline: 'Signal in the static' }).error, undefined);
  assert.equal(validateModuleConfig('media', { limit: 12 }).error, undefined);
  assert.match(validateModuleConfig('media', { remoteEmbed: '<iframe>' }).error, /Unsupported/);
  assert.match(validateModuleConfig('creator_summary', { script: 'alert(1)' }).error, /Unsupported/);
});

test('raw content view records are structurally progression-ineligible', () => {
  const view = new ContentView({ post: new mongoose.Types.ObjectId(), viewer: viewerId });
  assert.equal(view.trustClass, 'untrusted_engagement');
  assert.equal(view.progressionEligible, false);
});
