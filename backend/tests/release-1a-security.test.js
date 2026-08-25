const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const Friendship = require('../models/Friendship');
const ContentView = require('../models/ContentView');
const { canViewPost, canViewProfile, evaluateAccessRules, publicUserProjection, privateVerificationProjection } = require('../services/accessPolicy');
const { validateProfileUpdate } = require('../services/profileValidation');

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

test('profile contract rejects executable and unknown content while accepting validated theme tokens', () => {
  assert.match(validateProfileUpdate({ theme: { customCss: 'body{}' } }).error, /Unsupported theme fields/);
  assert.match(validateProfileUpdate({ customHtml: '<script>alert(1)</script>' }).error, /Unsupported profile fields/);
  assert.equal(validateProfileUpdate({ theme: { primaryColor: '#abcdef', animations: false } }).error, undefined);
  assert.match(validateProfileUpdate({ website: 'javascript:alert(1)' }).error, /http\(s\)/);
});

test('raw content view records are structurally progression-ineligible', () => {
  const view = new ContentView({ post: new mongoose.Types.ObjectId(), viewer: viewerId });
  assert.equal(view.trustClass, 'untrusted_engagement');
  assert.equal(view.progressionEligible, false);
});
