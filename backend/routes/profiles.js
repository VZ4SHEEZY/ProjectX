const express = require('express');
const mongoose = require('mongoose');
const { protect, optionalAuth } = require('../middleware/auth');
const User = require('../models/User');
const AccessRule = require('../models/AccessRule');
const Profile = require('../models/Profile');
const ProfileLayout = require('../models/ProfileLayout');
const ProfileModule = require('../models/ProfileModule');
const { validateProfileUpdate, MODULES } = require('../services/profileValidation');
const { canViewProfile, buildContext, evaluateAccessExpression, validateAccessExpression, publicUserProjection } = require('../services/accessPolicy');

const router = express.Router();

router.get('/me', protect, async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id }).lean();
  const layout = profile ? await ProfileLayout.findOne({ profile: profile._id }).lean() : null;
  const modules = profile ? await ProfileModule.find({ profile: profile._id }).sort('position').lean() : [];
  const accessRules = await AccessRule.find({ owner: req.user._id }).lean();
  res.json({ success: true, data: { profile, layout, modules, accessRules, compatibility: profile ? 'normalized' : 'legacy_user' } });
});

router.put('/me', protect, async (req, res) => {
  const validation = validateProfileUpdate(req.body?.profile || {});
  if (validation.error) return res.status(400).json({ success: false, message: validation.error });
  const source = validation.update;
  const profileFields = {
    displayName: source.displayName, bio: source.bio, avatar: source.avatar, banner: source.banner,
    locationLabel: source.location, website: source.website, socialLinks: source.socialLinks,
    privacy: source.profilePrivacy, followApprovalRequired: source.isPrivate,
    friendRequestAudience: source.friendRequestAudience, dmAudience: source.dmAudience
  };
  Object.keys(profileFields).forEach(key => profileFields[key] === undefined && delete profileFields[key]);
  const profile = await Profile.findOneAndUpdate({ user: req.user._id }, { $set: profileFields, $setOnInsert: { source: 'native' } }, { upsert: true, new: true, runValidators: true });
  const compatibilityFields = {};
  if (source.profilePrivacy !== undefined) compatibilityFields.profilePrivacy = profileFields.privacy;
  if (source.isPrivate !== undefined) compatibilityFields.isPrivate = source.isPrivate;
  if (source.dmAudience !== undefined) { compatibilityFields.dmAudience = source.dmAudience; compatibilityFields.allowDMs = source.dmAudience !== 'nobody'; }
  if (source.friendRequestAudience !== undefined) compatibilityFields.friendRequestAudience = source.friendRequestAudience;
  if (Object.keys(compatibilityFields).length) await User.updateOne({ _id: req.user._id }, { $set: compatibilityFields });
  if (req.body.layout) {
    const allowed = new Set(['theme','factionStarterTheme']);
    if (Object.keys(req.body.layout).some(key => !allowed.has(key)) || (req.body.layout.factionStarterTheme && !['full','partial','off'].includes(req.body.layout.factionStarterTheme))) return res.status(400).json({ success: false, message: 'Invalid layout contract' });
    await ProfileLayout.findOneAndUpdate({ profile: profile._id }, { $set: req.body.layout }, { upsert: true, new: true, runValidators: true });
  }
  res.json({ success: true, data: profile });
});

router.put('/me/access-rules', protect, async (req, res) => {
  const rules = req.body?.rules;
  if (!Array.isArray(rules) || rules.length > 30) return res.status(400).json({ success: false, message: 'rules must be an array of at most 30 items' });
  for (const rule of rules) if (!rule || (rule.id && !mongoose.isValidObjectId(rule.id)) || !validateAccessExpression(rule.expression) || !['hidden','locked_preview'].includes(rule.presentation)) return res.status(400).json({ success: false, message: 'Invalid access rule contract' });
  const ids = [];
  for (const rule of rules) {
    const query = rule.id ? { _id: rule.id, owner: req.user._id } : { _id: new mongoose.Types.ObjectId(), owner: req.user._id };
    const saved = await AccessRule.findOneAndUpdate(query, { $set: { name: String(rule.name || '').slice(0, 80), expression: rule.expression, presentation: rule.presentation, enabled: rule.enabled !== false }, $setOnInsert: { owner: req.user._id } }, { upsert: true, new: true, runValidators: true });
    ids.push(saved._id);
  }
  // Omitted rules remain persisted because a module may still reference them. Explicit
  // deletion is a separate future operation that must prove the rule is unreferenced.
  res.json({ success: true, data: await AccessRule.find({ owner: req.user._id }).lean() });
});

router.put('/me/modules', protect, async (req, res) => {
  const modules = req.body?.modules;
  if (!Array.isArray(modules) || modules.length > 20 || modules.some((item, index) => !item || !MODULES.has(item.type) || item.position !== index || typeof item.enabled !== 'boolean' || (item.accessRuleId && !mongoose.isValidObjectId(item.accessRuleId)) || (item.config && (typeof item.config !== 'object' || Array.isArray(item.config) || JSON.stringify(item.config).length > 4000)))) return res.status(400).json({ success: false, message: 'Invalid module contract' });
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) return res.status(409).json({ success: false, message: 'Create the normalized profile first' });
  await ProfileModule.deleteMany({ profile: profile._id });
  const ruleIds = modules.map(item => item.accessRuleId).filter(Boolean);
  if (ruleIds.length !== await AccessRule.countDocuments({ _id: { $in: ruleIds }, owner: req.user._id })) return res.status(400).json({ success: false, message: 'Access rules must belong to the profile owner' });
  if (modules.length) await ProfileModule.insertMany(modules.map(item => ({ profile: profile._id, type: item.type, position: item.position, enabled: item.enabled, config: item.config || {}, accessRule: item.accessRuleId || null, schemaVersion: 1 })));
  res.json({ success: true });
});

router.get('/:identifier', optionalAuth, async (req, res) => {
  const identityQuery = mongoose.isValidObjectId(req.params.identifier) ? { _id: req.params.identifier } : { username: req.params.identifier.toLowerCase() };
  const owner = await User.findOne({ ...identityQuery, isActive: { $ne: false } });
  if (!owner) return res.status(404).json({ success: false, message: 'Profile not found' });
  const shell = await canViewProfile(req.user, owner);
  if (!shell.allowed) return res.status(shell.reason === 'blocked' ? 404 : 403).json({ success: false, code: shell.reason === 'blocked' ? 'PROFILE_NOT_FOUND' : 'PROFILE_RESTRICTED', message: shell.reason === 'blocked' ? 'Profile not found' : 'Profile access is restricted' });
  const profile = await Profile.findOne({ user: owner._id }).lean();
  if (!profile) return res.json({ success: true, data: { owner: publicUserProjection(owner), profile: null, layout: null, modules: [], compatibility: 'legacy_user' } });
  const [layout, modules] = await Promise.all([ProfileLayout.findOne({ profile: profile._id }).lean(), ProfileModule.find({ profile: profile._id, enabled: true }).sort('position').populate('accessRule').lean()]);
  const context = shell.context || await buildContext(req.user, owner);
  const visibleModules = modules.flatMap(module => {
    if (!module.accessRule || module.accessRule.enabled === false) return [{ ...module, accessRule: undefined }];
    const result = evaluateAccessExpression(context, module.accessRule.expression);
    if (result.allowed) return [{ ...module, accessRule: undefined }];
    if (module.accessRule.presentation === 'locked_preview') return [{ _id: module._id, type: module.type, position: module.position, locked: true, presentation: 'locked_preview', requirements: module.accessRule.expression }];
    return [];
  });
  const publicProfile = { _id: profile._id, user: profile.user, displayName: profile.displayName, bio: profile.bio, avatar: profile.avatar, banner: profile.banner, locationLabel: profile.locationLabel, website: profile.website, socialLinks: profile.socialLinks, privacy: profile.privacy, followApprovalRequired: profile.followApprovalRequired };
  res.json({ success: true, data: { owner: publicUserProjection(owner, { includePresence: true }), profile: publicProfile, layout, modules: visibleModules, compatibility: 'normalized' } });
});

for (const layer of router.stack) for (const handler of layer.route?.stack || []) {
  const routeHandler = handler.handle;
  if (routeHandler.constructor.name === 'AsyncFunction') handler.handle = (req, res, next) => Promise.resolve(routeHandler(req, res, next)).catch(next);
}

module.exports = router;
