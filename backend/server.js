const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { protect } = require('./middleware/auth');
const { requireAdmin } = require('./middleware/admin');
const { validateEnv, createCorsOrigin } = require('./config/env');
require('dotenv').config();

validateEnv();
const corsOrigin = createCorsOrigin();

const app = express();
// Render terminates TLS and forwards the original client IP through one proxy.
// This must be set before express-rate-limit derives its per-client key.
app.set('trust proxy', 1);
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// CORS
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Initialize GridFS after connection
    try {
      const { initGridFS } = require('./utils/gridfs');
      initGridFS(conn.connection);
      console.log('GridFS initialized successfully');
    } catch (gridfsError) {
      console.error('Failed to initialize GridFS:', gridfsError.message);
      // Continue anyway - GridFS errors will be caught at upload time
    }
    
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
};

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api', require('./routes/comments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/search', require('./routes/search'));
app.use('/api/tips', require('./routes/tips'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/upload', require('./routes/upload-gridfs')); // GridFS uploads
app.use('/api/age-verification', require('./routes/age-verification'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/verify/yoti', require('./routes/verify-yoti'));

// NEW FEATURES - AI, Live Streams, Wallet, Stories, Voice, Groups, Creator
app.use('/api/ai', require('./routes/ai'));
app.use('/api/streams', require('./routes/streams'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/voice', require('./routes/voice'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/creator', require('./routes/creator'));
app.use('/api/admin', require('./routes/admin'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Seed endpoint - populate feed with test videos
app.post('/api/seed-feed', protect, requireAdmin, async (req, res) => {
  try {
    const Post = require('./models/Post');
    const User = require('./models/User');
    const seedVideos = require('./seed-feed-videos');

    // Clear old posts
    await Post.deleteMany({});
    console.log('Cleared old posts');

    let created = 0;
    const userCache = {};

    // Create/update posts with video URLs
    for (const videoData of seedVideos) {
      // Find or create user
      if (!userCache[videoData.username]) {
        userCache[videoData.username] = await User.findOne({ username: videoData.username });
      }
      const user = userCache[videoData.username];
      
      if (!user) {
        console.log('User not found:', videoData.username);
        continue;
      }

      const { username, views, likes, comments, ...postFields } = videoData;
      
      await Post.create({
        author: user._id,
        status: 'published',
        visibility: 'public',
        monetizationType: 'free',
        description: postFields.content,
        stats: { 
          views: views || 0, 
          likes: likes || 0, 
          comments: comments || 0, 
          shares: 0 
        },
        ...postFields,
      });
      created++;
    }

    const total = await Post.countDocuments();
    res.json({
      success: true,
      message: `Seeded ${created} posts with videos`,
      total: total
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({
      success: false,
      message: 'Seed failed',
      error: error.message
    });
  }
});

// Socket.io for real-time features. Identity comes only from a verified JWT.
const connectedUsers = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('_id isActive isCreator');
    if (!user || user.isActive === false) return next(new Error('Authentication failed'));
    socket.userId = user._id.toString();
    socket.isCreator = user.isCreator === true;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  const userSockets = connectedUsers.get(socket.userId) || new Set();
  userSockets.add(socket.id);
  connectedUsers.set(socket.userId, userSockets);
  socket.join(`user:${socket.userId}`);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`Socket ${socket.id} left room ${roomId}`);
  });

  socket.on('typing', (data) => {
    socket.to(data.roomId).emit('user-typing', {
      userId: socket.userId,
      isTyping: data.isTyping
    });
  });

  socket.on('stream-start', (data) => {
    if (socket.isCreator && typeof data?.streamId === 'string') {
      socket.broadcast.emit('stream-started', { streamId: data.streamId, title: data.title || 'Live Stream' });
    }
  });

  socket.on('stream-end', (data) => {
    if (socket.isCreator && typeof data?.streamId === 'string') {
      socket.broadcast.emit('stream-ended', { streamId: data.streamId });
    }
  });

  socket.on('stream-message', (data) => {
    if (typeof data?.streamId === 'string' && typeof data?.message === 'string' && data.message.trim().length <= 500) {
      socket.to(data.streamId).emit('stream-message', {
        streamId: data.streamId,
        message: data.message.trim(),
        userId: socket.userId
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.userId) {
      const sockets = connectedUsers.get(socket.userId);
      sockets?.delete(socket.id);
      if (!sockets?.size) connectedUsers.delete(socket.userId);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 CYBERDOPE BACKEND SERVER                              ║
║                                                            ║
║   Status: RUNNING                                          ║
║   Port: ${PORT}                                               ║
║   Environment: ${process.env.NODE_ENV || 'development'}                          ║
║   API: http://localhost:${PORT}/api                          ║
║   Socket.io: ws://localhost:${PORT}                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
}).catch((error) => {
  console.error(`Startup failed: ${error.message}`);
  process.exit(1);
});

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down`);
  io.close();
  await new Promise((resolve) => httpServer.close(resolve));
  await mongoose.connection.close();
  process.exit(0);
};

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

module.exports = { io, app };
