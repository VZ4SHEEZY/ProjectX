'use strict';

const express = require('express');
const { protect } = require('../middleware/auth');
const { userFacingProgressionEnabled, getUserProgression } = require('../progression/product/read-service');

const router = express.Router();

router.get('/users/:userId', protect, async (req, res, next) => {
  try {
    if (!userFacingProgressionEnabled()) return res.status(404).json({ success: false, message: 'Route not found' });
    const progression = await getUserProgression(req.params.userId);
    if (!progression) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: progression });
  } catch (error) { return next(error); }
});

module.exports = router;
