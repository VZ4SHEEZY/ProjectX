const express = require('express');
const { protect } = require('../middleware/auth');
const Profile = require('../models/Profile');
const ProfileLayout = require('../models/ProfileLayout');
const ProfileModule = require('../models/ProfileModule');
const { validateProfileUpdate, MODULES } = require('../services/profileValidation');

const router = express.Router();

router.get('/me', protect, async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id }).lean();
  const layout = profile ? await ProfileLayout.findOne({ profile: profile._id }).lean() : null;
  const modules = profile ? await ProfileModule.find({ profile: profile._id }).sort('position').lean() : [];
  res.json({ success: true, data: { profile, layout, modules, compatibility: profile ? 'normalized' : 'legacy_user' } });
});

router.put('/me', protect, async (req, res) => {
  const validation = validateProfileUpdate(req.body?.profile || {});
  if (validation.error) return res.status(400).json({ success: false, message: validation.error });
  const source = validation.update;
  const profileFields = {
    displayName: source.displayName, bio: source.bio, avatar: source.avatar, banner: source.banner,
    locationLabel: source.location, website: source.website, socialLinks: source.socialLinks,
    privacy: source.profilePrivacy === 'private' || source.isPrivate ? 'private' : 'public'
  };
  Object.keys(profileFields).forEach(key => profileFields[key] === undefined && delete profileFields[key]);
  const profile = await Profile.findOneAndUpdate({ user: req.user._id }, { $set: profileFields, $setOnInsert: { source: 'native' } }, { upsert: true, new: true, runValidators: true });
  if (req.body.layout) {
    const allowed = new Set(['theme','factionStarterTheme']);
    if (Object.keys(req.body.layout).some(key => !allowed.has(key)) || (req.body.layout.factionStarterTheme && !['full','partial','off'].includes(req.body.layout.factionStarterTheme))) return res.status(400).json({ success: false, message: 'Invalid layout contract' });
    await ProfileLayout.findOneAndUpdate({ profile: profile._id }, { $set: req.body.layout }, { upsert: true, new: true, runValidators: true });
  }
  res.json({ success: true, data: profile });
});

router.put('/me/modules', protect, async (req, res) => {
  const modules = req.body?.modules;
  if (!Array.isArray(modules) || modules.length > 20 || modules.some((item, index) => !item || !MODULES.has(item.type) || item.position !== index || typeof item.enabled !== 'boolean' || (item.config && (typeof item.config !== 'object' || Array.isArray(item.config))))) return res.status(400).json({ success: false, message: 'Invalid module contract' });
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) return res.status(409).json({ success: false, message: 'Create the normalized profile first' });
  await ProfileModule.deleteMany({ profile: profile._id });
  if (modules.length) await ProfileModule.insertMany(modules.map(item => ({ profile: profile._id, type: item.type, position: item.position, enabled: item.enabled, config: item.config || {}, schemaVersion: 1 })));
  res.json({ success: true });
});

for (const layer of router.stack) for (const handler of layer.route?.stack || []) {
  const routeHandler = handler.handle;
  if (routeHandler.constructor.name === 'AsyncFunction') handler.handle = (req, res, next) => Promise.resolve(routeHandler(req, res, next)).catch(next);
}

module.exports = router;
