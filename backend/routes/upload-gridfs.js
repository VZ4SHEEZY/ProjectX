const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const { uploadToGridFS, downloadFromGridFS, getFileInfo, deleteFromGridFS } = require('../utils/gridfs');
const Post = require('../models/Post');

// Use memory storage — stream directly to GridFS, no disk writes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB for videos
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/mpeg',
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type.'), false);
    }
  }
});

// Helper: generate thumbnail filename
const generateThumbnailFilename = (videoFileId) => {
  return `thumbnail-${videoFileId}.jpg`;
};

// @route   POST /api/upload/video-gridfs
// @desc    Upload video to GridFS
// @access  Private
router.post('/video-gridfs', protect, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const { title, description, isNSFW, monetizationType, price } = req.body;

    // Upload video to GridFS
    const videoResult = await uploadToGridFS(req.file.buffer, req.file.originalname, {
      userId: req.user._id,
      type: 'video',
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    // Create a simple thumbnail (just a placeholder for now)
    // In production, you'd extract frame from video using ffmpeg
    const thumbnailUrl = `/api/upload/thumbnail/${videoResult.fileId}`;

    // Create post document
    const post = await Post.create({
      author: req.user._id,
      type: 'video',
      title: title || 'Untitled Video',
      description: description || '',
      mediaUrl: `/api/upload/video/${videoResult.fileId}`,
      thumbnailUrl,
      duration: parseInt(req.body.duration) || 0,
      isNSFW: isNSFW === 'true' || isNSFW === true,
      monetizationType: monetizationType || 'free',
      price: price ? parseFloat(price) : 0,
      stats: {
        views: 0,
        likes: 0,
        comments: 0
      }
    });

    // Populate author
    await post.populate('author', 'username avatar walletAddress isVerified');

    res.status(201).json({
      success: true,
      data: {
        postId: post._id,
        fileId: videoResult.fileId,
        url: `/api/upload/video/${videoResult.fileId}`,
        thumbnailUrl,
        size: videoResult.size,
        post
      },
      message: 'Video uploaded successfully'
    });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/upload/video/:fileId
// @desc    Stream video from GridFS
// @access  Public
router.get('/video/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    // Validate ObjectId format
    if (!fileId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid file ID' });
    }

    // Get file info
    const fileInfo = await getFileInfo(require('mongoose').Types.ObjectId(fileId));

    // Set headers for video streaming
    res.setHeader('Content-Type', fileInfo.metadata?.mimeType || 'video/mp4');
    res.setHeader('Content-Length', fileInfo.length);
    res.setHeader('Accept-Ranges', 'bytes');

    // Stream the file
    const downloadStream = require('../utils/gridfs').getGridFSBucket().openDownloadStream(
      require('mongoose').Types.ObjectId(fileId)
    );

    downloadStream.on('error', (err) => {
      console.error('Download error:', err);
      res.status(404).json({ success: false, message: 'File not found' });
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error('Video retrieval error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/upload/thumbnail/:fileId
// @desc    Get thumbnail placeholder
// @access  Public
router.get('/thumbnail/:fileId', async (req, res) => {
  try {
    // For now, return a placeholder gradient image
    // In production, extract actual frame from video using ffmpeg
    const svgPlaceholder = `
      <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#39FF14;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#FF00FF;stop-opacity:0.3" />
          </linearGradient>
        </defs>
        <rect width="400" height="600" fill="#050505"/>
        <rect width="400" height="600" fill="url(#grad)"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
              fill="#39FF14" font-size="24" font-family="monospace" font-weight="bold">
          VIDEO THUMBNAIL
        </text>
      </svg>
    `;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svgPlaceholder);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/upload/video/:fileId
// @desc    Delete video from GridFS
// @access  Private
router.delete('/video/:fileId', protect, async (req, res) => {
  try {
    const { fileId } = req.params;

    // Validate ObjectId format
    if (!fileId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid file ID' });
    }

    const objectId = require('mongoose').Types.ObjectId(fileId);

    // Get file info to verify ownership (optional but recommended)
    const fileInfo = await getFileInfo(objectId);
    if (fileInfo.metadata?.userId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Delete from GridFS
    await deleteFromGridFS(objectId);

    // Delete associated post
    await Post.findOneAndDelete({ mediaUrl: `/api/upload/video/${fileId}` });

    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/upload/image-gridfs
// @desc    Upload image to GridFS
// @access  Private
router.post('/image-gridfs', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    // Upload image to GridFS
    const imageResult = await uploadToGridFS(req.file.buffer, req.file.originalname, {
      userId: req.user._id,
      type: 'image',
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    const { title, description, isNSFW } = req.body;

    // Create post document
    const post = await Post.create({
      author: req.user._id,
      type: 'image',
      title: title || 'Untitled Image',
      description: description || '',
      mediaUrl: `/api/upload/image/${imageResult.fileId}`,
      isNSFW: isNSFW === 'true' || isNSFW === true
    });

    await post.populate('author', 'username avatar walletAddress isVerified');

    res.status(201).json({
      success: true,
      data: {
        postId: post._id,
        fileId: imageResult.fileId,
        url: `/api/upload/image/${imageResult.fileId}`,
        size: imageResult.size,
        post
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/upload/image/:fileId
// @desc    Serve image from GridFS
// @access  Public
router.get('/image/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid file ID' });
    }

    const fileInfo = await getFileInfo(require('mongoose').Types.ObjectId(fileId));
    res.setHeader('Content-Type', fileInfo.metadata?.mimeType || 'image/jpeg');
    res.setHeader('Content-Length', fileInfo.length);

    const downloadStream = require('../utils/gridfs').getGridFSBucket().openDownloadStream(
      require('mongoose').Types.ObjectId(fileId)
    );

    downloadStream.on('error', (err) => {
      res.status(404).json({ success: false, message: 'File not found' });
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error('Image retrieval error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Multer error handler
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Max 500MB.' });
  }
  res.status(400).json({ success: false, message: error.message });
});

module.exports = router;
