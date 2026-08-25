const { id, isBlockedEitherWay, isFollowing, areFriends } = require('./relationshipPolicy');

const privateVerificationProjection = user => ({
  age: { verified: user?.isAgeVerified === true, verifiedAt: user?.ageVerifiedAt || null },
  creatorIdentity: { verified: user?.isCreatorVerified === true, verifiedAt: user?.creatorVerifiedAt || null }
});

async function buildContext(viewer, owner) {
  const viewerId = id(viewer);
  const ownerId = id(owner);
  const isOwner = Boolean(viewerId && viewerId === ownerId);
  const blocked = !isOwner && Boolean(viewerId) && await isBlockedEitherWay(viewerId, ownerId);
  return {
    viewer, owner, viewerId, ownerId, isOwner, blocked,
    follows: !blocked && !isOwner && Boolean(viewerId) && await isFollowing(viewerId, ownerId),
    friends: !blocked && !isOwner && Boolean(viewerId) && await areFriends(viewerId, ownerId),
    sameFaction: !blocked && Boolean(viewer?.faction && owner?.faction && viewer.faction === owner.faction),
    ageVerified: viewer?.isAgeVerified === true
  };
}

async function canViewProfile(viewer, owner) {
  const context = await buildContext(viewer, owner);
  if (context.blocked) return { allowed: false, reason: 'blocked', context };
  if (context.isOwner) return { allowed: true, context };
  const privacy = owner.profilePrivacy || (owner.isPrivate ? 'private' : 'public');
  if (privacy === 'public') return { allowed: true, context };
  if (privacy === 'followers' && context.follows) return { allowed: true, context };
  if (privacy === 'friends' && context.friends) return { allowed: true, context };
  return { allowed: false, reason: 'private_profile', context };
}

async function canViewPost(viewer, post, owner = post.author) {
  const context = await buildContext(viewer, owner);
  if (context.blocked) return { allowed: false, reason: 'blocked', context };
  if (context.isOwner) return { allowed: true, context };
  const profile = await canViewProfile(viewer, owner);
  if (!profile.allowed) return profile;
  if (post.isNSFW && !context.ageVerified) return { allowed: false, reason: 'age_verification_required', context };
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

function evaluateAccessRules(context, rules = []) {
  const active = rules.filter(rule => rule?.enabled !== false);
  if (!active.length) return { allowed: true };
  const matches = rule => ({
    everyone: true,
    followers: context.follows,
    friends: context.friends,
    same_faction: context.sameFaction,
    age_verified: context.ageVerified,
    owner: context.isOwner,
    // Paid entitlements remain false until an authoritative Subscription service exists.
    subscribers: false,
    creator_tier: false
  })[rule.audience] === true;
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

module.exports = { buildContext, canViewProfile, canViewPost, evaluateAccessRules, publicUserProjection, privateVerificationProjection };
