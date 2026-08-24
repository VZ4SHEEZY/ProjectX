const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Post = require('../models/Post');
const observability = require('../services/observability');

const failUpload = (req, error, mediaType) => {
  observability.increment('uploadFailures');
  observability.recordError('upload_failure', error, { requestId: req.id, mediaType, provider: 'cloudinary' });
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage — stream directly to Cloudinary, no disk writes
const uploader = (allowedTypes, maxBytes) => multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes, files: 1 },
  fileFilter: (req, file, cb) => cb(
    allowedTypes.includes(file.mimetype) ? null : new Error('Invalid file type.'),
    allowedTypes.includes(file.mimetype)
  )
});
const imageUpload = uploader(['image/jpeg', 'image/png', 'image/gif', 'image/webp'], 25 * 1024 * 1024);
const avatarUpload = uploader(['image/jpeg', 'image/png', 'image/webp'], 5 * 1024 * 1024);
const videoUpload = uploader(['video/mp4', 'video/webm', 'video/quicktime'], 100 * 1024 * 1024);
const audioUpload = uploader(['audio/mpeg', 'audio/wav', 'audio/ogg'], 25 * 1024 * 1024);

// Helper: upload buffer to Cloudinary
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    stream.end(buffer);
  });
};

// @route   POST /api/upload/image
router.post('/image', protect, imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'cyberdope/images',
      resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }]
    });
    res.json({ success: true, data: { url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height } });
  } catch (error) {
    failUpload(req, error, 'image');
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/upload/video
router.post('/video', protect, videoUpload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    
    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'cyberdope/videos',
      resource_type: 'video',
    });
    
    // Generate thumbnail
    const thumbnailUrl = result.secure_url.replace('/upload/', '/upload/so_0,w_400,h_600,c_fill/').replace(/\.\w+$/, '.jpg');
    
    // Get user details for faction
    const user = await User.findById(req.user._id);
    
    // Create Post document in MongoDB
    const post = await require('../models/Post').create({
      author: req.user._id,
      type: 'video',
      title: req.body.title || 'Untitled Video',
      description: req.body.description || '',
      mediaUrl: result.secure_url,
      thumbnailUrl,
      duration: result.duration || 0,
      visibility: 'public',
      faction: user?.faction || 'Unaffiliated',
      isNSFW: req.body.isNSFW === 'true' || req.body.isNSFW === true,
      isSensitive: req.body.isSensitive === 'true' || req.body.isSensitive === true,
      monetizationType: req.body.monetizationType || 'free',
      price: req.body.price ? parseFloat(req.body.price) : 0,
      isPublished: true,
      status: 'published'
    });
    
    // Populate author details
    await post.populate('author', 'username avatar walletAddress isVerified');
    
    res.status(201).json({ 
      success: true, 
      data: { 
        url: result.secure_url, 
        thumbnailUrl, 
        publicId: result.public_id, 
        duration: result.duration,
        post
      },
      message: 'Video uploaded and posted successfully'
    });
  } catch (error) {
    failUpload(req, error, 'video');
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/upload/audio
router.post('/audio', protect, audioUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'cyberdope/audio',
      resource_type: 'video', // Cloudinary uses 'video' for audio
    });
    res.json({ success: true, data: { url: result.secure_url, publicId: result.public_id, duration: result.duration } });
  } catch (error) {
    failUpload(req, error, 'audio');
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/upload/avatar
router.post('/avatar', protect, avatarUpload.single('avatar'), async (req, res) => {
  let result;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    const user = await User.findById(req.user._id).select('+avatarPublicId');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    result = await uploadToCloudinary(req.file.buffer, {
      folder: 'cyberdope/avatars',
      resource_type: 'image',
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }]
    });
    // Save to user profile
    const previousPublicId = user.avatarPublicId;
    user.avatar = result.secure_url;
    user.avatarPublicId = result.public_id;
    await user.save();
    if (previousPublicId?.startsWith('cyberdope/avatars/')) {
      try { await cloudinary.uploader.destroy(previousPublicId, { resource_type: 'image', invalidate: true }); }
      catch (cleanupError) { observability.recordError('avatar_replacement_cleanup_failure', cleanupError, { requestId: req.id }); }
    }
    res.json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
  } catch (error) {
    if (result?.public_id) {
      try { await cloudinary.uploader.destroy(result.public_id, { resource_type: 'image', invalidate: true }); } catch {}
    }
    failUpload(req, error, 'avatar');
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/upload/banner
router.post('/banner', protect, imageUpload.single('banner'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'cyberdope/banners',
      resource_type: 'image',
      transformation: [{ width: 1500, height: 500, crop: 'fill', quality: 'auto' }]
    });
    await User.findByIdAndUpdate(req.user._id, { banner: result.secure_url });
    res.json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
  } catch (error) {
    failUpload(req, error, 'banner');
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/upload/file (generic file upload for age verification)
router.post('/file', protect, imageUpload.single('file'), async (req, res) => {
  res.status(410).json({ success: false, code: 'IDENTITY_UPLOAD_UNAVAILABLE', message: 'Identity document uploads are not accepted.' });
});

router.use((error, req, res, next) => {
  observability.increment('uploadFailures');
  observability.write('warn', 'upload_rejected', { requestId: req.id, reason: error.code || 'validation' });
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large.' });
  }
  res.status(400).json({ success: false, message: error.message });
});

module.exports = router;
