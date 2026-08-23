const mongoose = require('mongoose');
const User = require('../models/User');
const Stream = require('../models/Stream');
const Group = require('../models/Group');
const observability = require('./observability');

const normalizeRoomRequest = (roomId) => {
  if (typeof roomId !== 'string' || roomId.length > 100) return null;
  const trimmed = roomId.trim();
  if (mongoose.isValidObjectId(trimmed)) return { type: 'stream', id: trimmed };

  const match = trimmed.match(/^(conversation|stream|group):([0-9a-fA-F]{24})(?::([0-9a-fA-F]{24}))?$/);
  if (!match) return null;
  return { type: match[1], id: match[2], secondId: match[3] };
};

const authorizeRoom = async (roomId, userId) => {
  const request = normalizeRoomRequest(roomId);
  if (!request) return null;
  const currentUserId = userId.toString();

  if (request.type === 'stream') {
    const stream = await Stream.findOne({ _id: request.id, isLive: true }).select('_id streamer viewers').lean();
    if (!stream) return null;
    return { room: `stream:${stream._id}`, type: 'stream', resourceId: stream._id.toString() };
  }

  if (request.type === 'group') {
    const group = await Group.exists({
      _id: request.id,
      $or: [{ creator: userId }, { admins: userId }, { 'members.user': userId }]
    });
    return group ? { room: `group:${request.id}`, type: 'group', resourceId: request.id } : null;
  }

  const participantIds = request.secondId ? [request.id, request.secondId] : [currentUserId, request.id];
  if (!participantIds.includes(currentUserId)) return null;
  const otherId = participantIds.find((id) => id !== currentUserId);
  if (!otherId || !await User.exists({ _id: otherId, isActive: { $ne: false } })) return null;
  return {
    room: `conversation:${participantIds.sort().join(':')}`,
    type: 'conversation',
    resourceId: otherId
  };
};

const registerAuthorizedSocketHandlers = (io, socket) => {
  const joinedAliases = new Map();

  socket.on('join-room', async (roomId, acknowledge = () => {}) => {
    try {
      const authorization = await authorizeRoom(roomId, socket.userId);
      if (!authorization) return acknowledge({ success: false, error: 'Room access denied' });
      await socket.join(authorization.room);
      joinedAliases.set(roomId, authorization);
      acknowledge({ success: true });
    } catch (error) {
      observability.increment('socketErrors');
      observability.recordError('socket_room_error', error, { socketId: socket.id });
      acknowledge({ success: false, error: 'Room access denied' });
    }
  });

  socket.on('leave-room', async (roomId) => {
    const authorization = joinedAliases.get(roomId);
    if (!authorization) return;
    await socket.leave(authorization.room);
    joinedAliases.delete(roomId);
  });

  socket.on('typing', (data) => {
    const authorization = joinedAliases.get(data?.roomId);
    if (authorization?.type !== 'conversation') return;
    socket.to(authorization.room).emit('user-typing', {
      userId: socket.userId,
      isTyping: data.isTyping === true
    });
  });

  socket.on('stream-start', async (data) => {
    if (!mongoose.isValidObjectId(data?.streamId)) return;
    const stream = await Stream.findOne({ _id: data.streamId, streamer: socket.userId, isLive: true }).select('_id').lean();
    if (stream) socket.broadcast.emit('stream-started', { streamId: data.streamId, title: data.title || 'Live Stream' });
  });

  socket.on('stream-end', async (data) => {
    if (!mongoose.isValidObjectId(data?.streamId)) return;
    const stream = await Stream.exists({ _id: data.streamId, streamer: socket.userId });
    if (stream) socket.broadcast.emit('stream-ended', { streamId: data.streamId });
  });

  socket.on('stream-message', (data) => {
    const authorization = joinedAliases.get(data?.streamId);
    if (authorization?.type !== 'stream' || typeof data?.message !== 'string') return;
    const message = data.message.trim();
    if (!message || message.length > 500) return;
    socket.to(authorization.room).emit('stream-message', {
      streamId: authorization.resourceId,
      message,
      userId: socket.userId
    });
  });
};

module.exports = { normalizeRoomRequest, authorizeRoom, registerAuthorizedSocketHandlers };
