import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  connect(userId: string) {
    if (this.socket?.connected) {
      return;
    }

    this.userId = userId;
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.socket?.emit('join', userId);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
    }
  }

  joinRoom(roomId: string) {
    this.socket?.emit('join-room', roomId);
  }

  leaveRoom(roomId: string) {
    this.socket?.emit('leave-room', roomId);
  }

  sendComment(postId: string, comment: any) {
    this.socket?.emit('new-comment', { postId, comment });
  }

  sendMessage(recipientId: string, message: any) {
    this.socket?.emit('new-message', { recipientId, message });
  }

  setTyping(roomId: string, isTyping: boolean) {
    this.socket?.emit('typing', { roomId, isTyping });
  }

  startStream(streamData: any) {
    this.socket?.emit('stream-start', streamData);
  }

  endStream(streamId: string) {
    this.socket?.emit('stream-end', { streamId });
  }

  sendStreamMessage(streamId: string, message: string) {
    this.socket?.emit('stream-message', { streamId, message, userId: this.userId });
  }

  sendNotification(recipientId: string, notification: any) {
    this.socket?.emit('send-notification', { recipientId, ...notification });
  }

  // Event listeners
  onComment(callback: (data: any) => void) {
    this.socket?.on('comment', callback);
  }

  onMessage(callback: (data: any) => void) {
    this.socket?.on('message', callback);
  }

  onUserTyping(callback: (data: any) => void) {
    this.socket?.on('user-typing', callback);
  }

  onStreamStarted(callback: (data: any) => void) {
    this.socket?.on('stream-started', callback);
  }

  onStreamEnded(callback: (data: any) => void) {
    this.socket?.on('stream-ended', callback);
  }

  onStreamMessage(callback: (data: any) => void) {
    this.socket?.on('stream-message', callback);
  }

  onNotification(callback: (data: any) => void) {
    this.socket?.on('notification', callback);
  }

  // Remove listeners
  offComment() {
    this.socket?.off('comment');
  }

  offMessage() {
    this.socket?.off('message');
  }

  offUserTyping() {
    this.socket?.off('user-typing');
  }

  offStreamStarted() {
    this.socket?.off('stream-started');
  }

  offStreamEnded() {
    this.socket?.off('stream-ended');
  }

  offStreamMessage() {
    this.socket?.off('stream-message');
  }

  offNotification() {
    this.socket?.off('notification');
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService;
