'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const { canViewProfile } = require('../services/accessPolicy');
const { userFacingProgressionEnabled, getUserProgression } = require('../progression/product/read-service');

const router = express.Router();

router.get('/users/:userId', protect, async (req, res, next) => {
  try {
    if (!userFacingProgressionEnabled()) return res.status(404).json({ success: false, message: 'Route not found' });
    if (!mongoose.isValidObjectId(req.params.userId)) return res.status(404).json({ success: false, message: 'User not found' });
    const owner = await User.findOne({ _id: req.params.userId, isActive: { $ne: false } });
    if (!owner) return res.status(404).json({ success: false, message: 'User not found' });
    const access = await canViewProfile(req.user, owner);
    if (!access.allowed) {
      return res.status(access.reason === 'blocked' ? 404 : 403).json({
        success: false,
        code: access.reason === 'blocked' ? 'PROFILE_NOT_FOUND' : 'PROFILE_RESTRICTED',
        message: access.reason === 'blocked' ? 'User not found' : 'Profile access is restricted'
      });
    }
    const progression = await getUserProgression(req.params.userId);
    if (!progression) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: progression });
  } catch (error) { return next(error); }
});

module.exports = router;
