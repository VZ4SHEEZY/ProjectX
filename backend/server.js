const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://project-x-sage-nine.vercel.app",
      process.env.FRONTEND_URL
    ].filter(Boolean),
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
  max: 100
});
app.use(limiter);

// CORS
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://project-x-sage-nine.vercel.app",
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
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

// NEW FEATURES - AI, Live Streams, Wallet, Stories, Voice, Groups
app.use('/api/ai', require('./routes/ai'));
app.use('/api/streams', require('./routes/streams'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/voice', require('./routes/voice'));
app.use('/api/groups', require('./routes/groups'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Socket.io for real-time features
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;
    console.log(`User ${userId} joined with socket ${socket.id}`);
  });

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`Socket ${socket.id} left room ${roomId}`);
  });

  socket.on('new-comment', (data) => {
    socket.to(data.postId).emit('comment', data);
  });

  socket.on('new-message', (data) => {
    const recipientSocketId = connectedUsers.get(data.recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('message', data);
    }
  });

  socket.on('typing', (data) => {
    socket.to(data.roomId).emit('user-typing', {
      userId: socket.userId,
      isTyping: data.isTyping
    });
  });

  socket.on('stream-start', (data) => {
    socket.broadcast.emit('stream-started', data);
  });

  socket.on('stream-end', (data) => {
    socket.broadcast.emit('stream-ended', data);
  });

  socket.on('stream-message', (data) => {
    socket.to(data.streamId).emit('stream-message', data);
  });

  socket.on('send-notification', (data) => {
    const recipientSocketId = connectedUsers.get(data.recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('notification', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
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
});

module.exports = { io };
