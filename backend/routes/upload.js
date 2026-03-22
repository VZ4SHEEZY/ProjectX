const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage — stream directly to Cloudinary, no disk writes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type.'), false);
    }
  }
});

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
router.post('/image', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'cyberdope/images',
      resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }]
    });
    res.json({ success: true, data: { url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/upload/video
router.post('/video', protect, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'cyberdope/videos',
      resource_type: 'video',
    });
    // Generate thumbnail
    const thumbnailUrl = result.secure_url.replace('/upload/', '/upload/so_0,w_400,h_600,c_fill/').replace(/\.\w+$/, '.jpg');
    res.json({ success: true, data: { url: result.secure_url, thumbnailUrl, publicId: result.public_id, duration: result.duration } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/upload/audio
router.post('/audio', protect, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'cyberdope/audio',
      resource_type: 'video', // Cloudinary uses 'video' for audio
    });
    res.json({ success: true, data: { url: result.secure_url, publicId: result.public_id, duration: result.duration } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/upload/avatar
router.post('/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'cyberdope/avatars',
      resource_type: 'image',
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }]
    });
    // Save to user profile
    await User.findByIdAndUpdate(req.user._id, { avatar: result.secure_url });
    res.json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/upload/banner
router.post('/banner', protect, upload.single('banner'), async (req, res) => {
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
    res.status(500).json({ success: false, message: error.message });
  }
});

// Multer error handler
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Max 100MB.' });
  }
  res.status(400).json({ success: false, message: error.message });
});

module.exports = router;
