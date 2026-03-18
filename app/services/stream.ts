import api from './api';

export const streamAPI = {
  // Get all active streams
  getStreams: async () => {
    const response = await api.get('/streams');
    return response.data;
  },

  // Get stream by ID
  getStream: async (streamId: string) => {
    const response = await api.get(`/streams/${streamId}`);
    return response.data;
  },

  // Start a new stream
  startStream: async (title: string, description?: string, category?: string) => {
    const response = await api.post('/streams/start', { title, description, category });
    return response.data;
  },

  // End stream
  endStream: async (streamId: string) => {
    const response = await api.post(`/streams/${streamId}/end`);
    return response.data;
  },

  // Join stream as viewer
  joinStream: async (streamId: string) => {
    const response = await api.post(`/streams/${streamId}/join`);
    return response.data;
  },

  // Leave stream
  leaveStream: async (streamId: string) => {
    const response = await api.post(`/streams/${streamId}/leave`);
    return response.data;
  },

  // Send chat message
  sendChatMessage: async (streamId: string, message: string) => {
    const response = await api.post(`/streams/${streamId}/chat`, { message });
    return response.data;
  },

  // Get stream chat
  getStreamChat: async (streamId: string) => {
    const response = await api.get(`/streams/${streamId}/chat`);
    return response.data;
  },

  // Send tip during stream
  sendTip: async (streamId: string, amount: number, message?: string) => {
    const response = await api.post(`/streams/${streamId}/tip`, { amount, message });
    return response.data;
  },

  // Get user's streams
  getUserStreams: async (userId: string) => {
    const response = await api.get(`/streams/user/${userId}`);
    return response.data;
  }
};

export default streamAPI;
