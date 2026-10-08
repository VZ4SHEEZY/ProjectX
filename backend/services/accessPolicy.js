const { id, isBlockedEitherWay, isFollowing, areFriends } = require('./relationshipPolicy');

// No legitimate provider adapter is installed. Legacy flags never grant restricted access.
const hasVerifiedAge = () => false;

const privateVerificationProjection = user => ({
  age: { verified: hasVerifiedAge(user), verifiedAt: null },
  creatorIdentity: { verified: false, verifiedAt: null }
});

async function buildContext(viewer, owner) {
  const viewerId = id(viewer);
  const ownerId = id(owner);
  const isOwner = Boolean(viewerId && viewerId === ownerId);
  const blocked = !isOwner && Boolean(viewerId) && await isBlockedEitherWay(viewerId, ownerId);
  return {
    viewer, owner, viewerId, ownerId, isOwner, blocked,
    authenticated: Boolean(viewerId),
    follows: !blocked && !isOwner && Boolean(viewerId) && await isFollowing(viewerId, ownerId),
    followedByOwner: !blocked && !isOwner && Boolean(viewerId) && await isFollowing(ownerId, viewerId),
    friends: !blocked && !isOwner && Boolean(viewerId) && await areFriends(viewerId, ownerId),
    sameFaction: !blocked && Boolean(viewer?.faction && owner?.faction && viewer.faction === owner.faction),
    ageVerified: hasVerifiedAge(viewer)
  };
}

async function canViewProfile(viewer, owner) {
  const context = await buildContext(viewer, owner);
  if (owner?.isActive === false) return { allowed: false, reason: 'content_unavailable', context };
  if (context.blocked) return { allowed: false, reason: 'blocked', context };
  if (context.isOwner) return { allowed: true, context };
  const privacy = owner.profilePrivacy || (owner.isPrivate ? 'private' : 'public');
  if (privacy === 'public') return { allowed: true, context };
  if (privacy === 'users' && context.authenticated) return { allowed: true, context };
  if (privacy === 'followers' && context.follows) return { allowed: true, context };
  if (privacy === 'friends' && context.friends) return { allowed: true, context };
  return { allowed: false, reason: 'private_profile', context };
}

async function canViewPost(viewer, post, owner = post.author) {
  // Interaction routes often receive an unpopulated author ID; load the same
  // privacy/enforcement fields used by feeds before authorizing the action.
  if (typeof owner === 'string' || owner?.constructor?.name === 'ObjectId') owner = await require('../models/User').findById(owner).select('profilePrivacy isPrivate isActive faction');
  if (!owner || !id(owner)) return { allowed: false, reason: 'content_unavailable' };
  const context = await buildContext(viewer, owner);
  if (owner?.isActive === false) return { allowed: false, reason: 'content_unavailable', context };
  if (context.blocked) return { allowed: false, reason: 'blocked', context };
  if (post.moderationState === 'removed' || post.status !== undefined && post.status !== 'published' && !context.isOwner) return { allowed: false, reason: 'content_unavailable', context };
  if (post.isNSFW && !context.ageVerified) return { allowed: false, reason: 'age_verification_required', context };
  if (context.isOwner) return { allowed: true, context };
  const profile = await canViewProfile(viewer, owner);
  if (!profile.allowed) return profile;
  const visibility = ['subscribers', 'ppv', 'faction'].includes(post.visibility) ? post.visibility : (post.monetizationType || post.visibility);
  if (!visibility || visibility === 'public' || visibility === 'free') return { allowed: true, context };
  if (visibility === 'faction') {
    const matchesFaction = Boolean(viewer?.faction && post.faction && viewer.faction === post.faction);
    return { allowed: matchesFaction, reason: matchesFaction ? undefined : 'faction_required', context };
  }
  if (visibility === 'ppv') return { allowed: Boolean(viewer && post.unlocks?.some(unlock => id(unlock.user) === context.viewerId)), reason: 'purchase_required', context };
  // Paid subscriptions are intentionally unavailable in Release 1A. Never infer entitlement.
  return { allowed: false, reason: 'subscription_required', context };
}

const PREDICATES = new Set(['everyone','authenticated','followers','friends','same_faction','age_verified','subscribers','creator_tier','owner']);
function validateAccessExpression(node, depth = 0, count = { value: 0 }) {
  if (!node || typeof node !== 'object' || Array.isArray(node) || depth > 4 || ++count.value > 20) return false;
  if (node.op === 'predicate') return PREDICATES.has(node.type) && Object.keys(node).every(key => ['op','type','creatorTierId'].includes(key)) && (node.type !== 'creator_tier' || typeof node.creatorTierId === 'string');
  return ['and','or'].includes(node.op) && Array.isArray(node.children) && node.children.length >= 2 && node.children.length <= 8 && Object.keys(node).every(key => ['op','children'].includes(key)) && node.children.every(child => validateAccessExpression(child, depth + 1, count));
}

function evaluateAccessExpression(context, node) {
  if (!validateAccessExpression(node)) return { allowed: false, reason: 'invalid_access_rule' };
  const evaluate = current => {
    if (current.op === 'and') return current.children.every(evaluate);
    if (current.op === 'or') return current.children.some(evaluate);
    return ({ everyone: true, authenticated: context.authenticated, followers: context.follows, friends: context.friends, same_faction: context.sameFaction, age_verified: context.ageVerified, owner: context.isOwner, subscribers: false, creator_tier: false })[current.type] === true;
  };
  const containsAgeGate = current => current.op === 'predicate' ? current.type === 'age_verified' : current.children.some(containsAgeGate);
  const allowed = (context.isOwner && !containsAgeGate(node)) || evaluate(node);
  return { allowed, reason: allowed ? undefined : 'access_rule_required' };
}

// Release 1A compatibility adapter for callers that still supply flat rules.
function evaluateAccessRules(context, rules = []) {
  const active = rules.filter(rule => rule?.enabled !== false);
  if (!active.length) return { allowed: true };
  const matches = rule => evaluateAccessExpression(context, { op: 'predicate', type: rule.audience }).allowed;
  if (active.some(rule => rule.effect === 'deny' && matches(rule))) return { allowed: false, reason: 'explicit_deny' };
  const allows = active.filter(rule => rule.effect !== 'deny');
  return { allowed: allows.length === 0 || allows.some(matches), reason: 'access_rule_required' };
}

function publicUserProjection(user, { includePresence = false } = {}) {
  const source = user?.toObject ? user.toObject() : { ...user };
  const fields = ['_id', 'username', 'displayName', 'avatar', 'banner', 'bio', 'faction', 'factionColor', 'isVerified', 'isCreator', 'creatorStatus', 'followersCount', 'followingCount', 'postsCount', 'location', 'website', 'socialLinks', 'subscriptionTiers', 'profilePrivacy', 'createdAt'];
  const result = {};
  for (const field of fields) if (source[field] !== undefined) result[field] = source[field];
  if (source.theme) {
    const safeTheme = ['primaryColor','secondaryColor','accentColor','backgroundColor','fontFamily','fontSize','animations','glowEffects','scanlines','backgroundImage','cursorEffect','layoutStyle'];
    result.theme = Object.fromEntries(safeTheme.filter(key => source.theme[key] !== undefined).map(key => [key, source.theme[key]]));
  }
  if (includePresence && source.showOnlineStatus !== false) {
    result.isOnline = source.isOnline;
    result.lastActive = source.lastActive;
  }
  return result;
}

function publicPostProjection(post) {
  const source = post?.toObject ? post.toObject() : post;
  const fields = ['_id','type','title','description','content','mediaUrl','thumbnailUrl','duration','monetizationType','price','isNSFW','isSensitive','views','likesCount','commentsCount','sharesCount','tags','isLive','isPinned','status','visibility','stats','faction','createdAt','updatedAt'];
  const result = Object.fromEntries(fields.filter(key => source[key] !== undefined).map(key => [key, source[key]]));
  result.author = publicUserProjection(source.author);
  result.canAccess = true;
  return result;
}

module.exports = { publicPostProjection, hasVerifiedAge, buildContext, canViewProfile, canViewPost, validateAccessExpression, evaluateAccessExpression, evaluateAccessRules, publicUserProjection, privateVerificationProjection };
