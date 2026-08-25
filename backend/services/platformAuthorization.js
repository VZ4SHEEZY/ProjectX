const PlatformRole = require('../models/PlatformRole');
const AuditLog = require('../models/AuditLog');

const LEVEL = Object.freeze({ moderator: 1, admin: 2, platform_owner: 3 });

async function rolesFor(user) {
  if (!user?._id) return [];
  const roles = await PlatformRole.find({ user: user._id, state: 'active' }).select('role -_id').lean();
  return roles.map(entry => entry.role);
}

async function hasPlatformRole(user, minimumRole = 'admin') {
  if (!user?._id || !LEVEL[minimumRole]) return false;
  // Preserve existing admin availability before the additive role backfill.
  if (minimumRole !== 'platform_owner' && user.isAdmin === true) return true;
  const roles = await rolesFor(user);
  if (roles.some(role => LEVEL[role] >= LEVEL[minimumRole])) return true;
  return false;
}

async function auditPlatformAction(user, action, details = {}) {
  const roles = await rolesFor(user);
  const actorRole = roles.includes('platform_owner') ? 'platform_owner' : roles.includes('admin') ? 'admin' : roles.includes('moderator') ? 'moderator' : 'admin';
  return AuditLog.create({ admin: user._id, actorRole, action, targetType: details.targetType || null, targetId: details.targetId || null, details });
}

module.exports = { LEVEL, rolesFor, hasPlatformRole, auditPlatformAction };
