const express = require('express');
const router = express.Router();
const { protect: auth } = require('../middleware/auth');
const VoiceMessage = require('../models/VoiceMessage');
const multer = require('multer');
const { storeVoiceAudio, deleteVoiceAudio } = require('../services/mediaStorage');
const observability = require('../services/observability');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type'));
    }
  }
});

// Send voice message
router.post('/send', auth, upload.single('audio'), async (req, res) => {
  let storedAudio;
  try {
    const { recipientId, duration, waveform } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file required' });
    }
    
    storedAudio = await storeVoiceAudio({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      ownerId: req.user._id
    });

    const voiceMessage = new VoiceMessage({
      sender: req.user._id,
      recipient: recipientId,
      audioUrl: storedAudio.url,
      storageKey: storedAudio.storageKey,
      duration: parseInt(duration) || 0,
      waveform: waveform ? JSON.parse(waveform) : [],
      isListened: false
    });
    
    await voiceMessage.save();
    
    const populatedMessage = await VoiceMessage.findById(voiceMessage._id)
      .populate('sender', 'username displayName avatar')
      .populate('recipient', 'username displayName avatar');
    
    res.json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    observability.increment('uploadFailures');
    observability.recordError('voice_upload_failure', error, { requestId: req.id });
    if (storedAudio?.storageKey) {
      try { await deleteVoiceAudio(storedAudio.storageKey); } catch (cleanupError) {
        observability.recordError('voice_upload_cleanup_failure', cleanupError, { requestId: req.id });
      }
    }
    res.status(500).json({ error: 'Failed to send voice message' });
  }
});

// Get voice messages between users
router.get('/conversation/:userId', auth, async (req, res) => {
  try {
    const messages = await VoiceMessage.find({
      $or: [
        { sender: req.user._id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user._id }
      ]
    })
      .populate('sender', 'username displayName avatar')
      .populate('recipient', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({
      success: true,
      messages: messages.reverse()
    });
  } catch (error) {
    console.error('Get Voice Messages Error:', error);
    res.status(500).json({ error: 'Failed to fetch voice messages' });
  }
});

// Mark voice message as listened
router.post('/:id/listen', auth, async (req, res) => {
  try {
    const message = await VoiceMessage.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    message.isListened = true;
    message.listenedAt = new Date();
    await message.save();
    
    res.json({
      success: true,
      message: 'Marked as listened'
    });
  } catch (error) {
    console.error('Listen Voice Error:', error);
    res.status(500).json({ error: 'Failed to mark as listened' });
  }
});

// Get unread voice message count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await VoiceMessage.countDocuments({
      recipient: req.user._id,
      isListened: false
    });
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get Unread Count Error:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Delete voice message
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await VoiceMessage.findOne({
      _id: req.params.id,
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ]
    }).select('+storageKey');
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (message.storageKey) await deleteVoiceAudio(message.storageKey);
    await VoiceMessage.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Voice message deleted'
    });
  } catch (error) {
    console.error('Delete Voice Error:', error);
    res.status(500).json({ error: 'Failed to delete voice message' });
  }
});

// Transcription is deliberately unavailable until a real provider is configured.
router.post('/:id/transcribe', auth, async (req, res) => {
  try {
    const message = await VoiceMessage.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const canAccess = String(message.sender) === String(req.user._id) || String(message.recipient) === String(req.user._id);
    if (!canAccess) return res.status(404).json({ error: 'Message not found' });
    res.status(501).json({ success: false, code: 'TRANSCRIPTION_UNAVAILABLE', error: 'Voice transcription is not currently available' });
  } catch (error) {
    console.error('Transcribe Voice Error:', error);
    res.status(500).json({ error: 'Failed to transcribe' });
  }
});

// Add voice comment to post
router.post('/comment/:postId', auth, upload.single('audio'), async (req, res) => {
  try {
    const { duration } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file required' });
    }
    
    const storedAudio = await storeVoiceAudio({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      ownerId: req.user._id
    });

    res.json({
      success: true,
      audioUrl: storedAudio.url,
      duration: parseInt(duration) || 0,
      message: 'Voice comment added'
    });
  } catch (error) {
    console.error('Voice Comment Error:', error);
    res.status(500).json({ error: 'Failed to add voice comment' });
  }
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Audio file too large' });
  }
  if (error) return res.status(400).json({ error: error.message });
  next();
});

module.exports = router;
