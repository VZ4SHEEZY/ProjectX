const express = require('express');
const router = express.Router();
const { protect: auth } = require('../middleware/auth');
const Stream = require('../models/Stream');
const User = require('../models/User');
const Tip = require('../models/Tip');

// Get all active streams
router.get('/', async (req, res) => {
  try {
    const streams = await Stream.find({ isLive: true })
      .populate('streamer', 'username displayName avatar')
      .sort({ startedAt: -1 });
    
    res.json({
      success: true,
      streams,
      count: streams.length
    });
  } catch (error) {
    console.error('Get Streams Error:', error);
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});

// Get stream by ID
router.get('/:id', async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id)
      .populate('streamer', 'username displayName avatar followers')
      .populate('viewers', 'username displayName avatar');
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    res.json({
      success: true,
      stream
    });
  } catch (error) {
    console.error('Get Stream Error:', error);
    res.status(500).json({ error: 'Failed to fetch stream' });
  }
});

// Start a new stream
router.post('/start', auth, async (req, res) => {
  try {
    const { title, description, thumbnail, category } = req.body;
    
    // Check if user already has an active stream
    const existingStream = await Stream.findOne({ 
      streamer: req.user._id, 
      isLive: true 
    });
    
    if (existingStream) {
      return res.status(400).json({ error: 'You already have an active stream' });
    }
    
    const stream = new Stream({
      streamer: req.user._id,
      title,
      description,
      thumbnail,
      category: category || 'General',
      isLive: true,
      startedAt: new Date(),
      viewers: [],
      viewerCount: 0,
      chatMessages: [],
      tips: []
    });
    
    await stream.save();
    
    // Update user's isLive status
    await User.findByIdAndUpdate(req.user._id, { isLive: true });
    
    // Populate and return
    const populatedStream = await Stream.findById(stream._id)
      .populate('streamer', 'username displayName avatar');
    
    res.json({
      success: true,
      stream: populatedStream,
      message: 'Stream started successfully'
    });
  } catch (error) {
    console.error('Start Stream Error:', error);
    res.status(500).json({ error: 'Failed to start stream' });
  }
});

// End stream
router.post('/:id/end', auth, async (req, res) => {
  try {
    const stream = await Stream.findOne({
      _id: req.params.id,
      streamer: req.user._id
    });
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    stream.isLive = false;
    stream.endedAt = new Date();
    await stream.save();
    
    // Update user's isLive status
    await User.findByIdAndUpdate(req.user._id, { isLive: false });
    
    res.json({
      success: true,
      message: 'Stream ended successfully',
      duration: Math.floor((stream.endedAt - stream.startedAt) / 1000) // seconds
    });
  } catch (error) {
    console.error('End Stream Error:', error);
    res.status(500).json({ error: 'Failed to end stream' });
  }
});

// Join stream as viewer
router.post('/:id/join', auth, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    if (!stream.isLive) {
      return res.status(400).json({ error: 'Stream is not live' });
    }
    
    // Add viewer if not already in list
    if (!stream.viewers.includes(req.user._id)) {
      stream.viewers.push(req.user._id);
      stream.viewerCount = stream.viewers.length;
      await stream.save();
    }
    
    res.json({
      success: true,
      viewerCount: stream.viewerCount,
      message: 'Joined stream'
    });
  } catch (error) {
    console.error('Join Stream Error:', error);
    res.status(500).json({ error: 'Failed to join stream' });
  }
});

// Leave stream
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    // Remove viewer
    stream.viewers = stream.viewers.filter(
      viewerId => viewerId.toString() !== req.user._id.toString()
    );
    stream.viewerCount = stream.viewers.length;
    await stream.save();
    
    res.json({
      success: true,
      viewerCount: stream.viewerCount,
      message: 'Left stream'
    });
  } catch (error) {
    console.error('Leave Stream Error:', error);
    res.status(500).json({ error: 'Failed to leave stream' });
  }
});

// Send chat message in stream
router.post('/:id/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const stream = await Stream.findById(req.params.id);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    const chatMessage = {
      user: req.user._id,
      message,
      sentAt: new Date()
    };
    
    stream.chatMessages.push(chatMessage);
    await stream.save();
    
    // Populate the message for response
    const populatedMessage = await Stream.findById(stream._id)
      .populate('chatMessages.user', 'username displayName avatar');
    
    const newMessage = populatedMessage.chatMessages[populatedMessage.chatMessages.length - 1];
    
    res.json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('Stream Chat Error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Send tip during stream
router.post('/:id/tip', auth, async (req, res) => {
  try {
    const { amount, message } = req.body;
    const stream = await Stream.findById(req.params.id);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    // Create tip
    const tip = new Tip({
      sender: req.user._id,
      recipient: stream.streamer,
      amount,
      message,
      type: 'stream',
      streamId: stream._id
    });
    
    await tip.save();
    
    // Add to stream tips
    stream.tips.push(tip._id);
    stream.totalTips = (stream.totalTips || 0) + amount;
    await stream.save();
    
    // Update recipient's earnings
    await User.findByIdAndUpdate(stream.streamer, {
      $inc: { totalEarnings: amount }
    });
    
    res.json({
      success: true,
      tip,
      message: 'Tip sent successfully'
    });
  } catch (error) {
    console.error('Stream Tip Error:', error);
    res.status(500).json({ error: 'Failed to send tip' });
  }
});

// Get stream chat history
router.get('/:id/chat', async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id)
      .populate('chatMessages.user', 'username displayName avatar');
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    res.json({
      success: true,
      messages: stream.chatMessages.slice(-100) // Last 100 messages
    });
  } catch (error) {
    console.error('Get Stream Chat Error:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

// Get user's stream history
router.get('/user/:userId', async (req, res) => {
  try {
    const streams = await Stream.find({ streamer: req.params.userId })
      .populate('streamer', 'username displayName avatar')
      .sort({ startedAt: -1 });
    
    res.json({
      success: true,
      streams,
      count: streams.length
    });
  } catch (error) {
    console.error('Get User Streams Error:', error);
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});

module.exports = router;
