import api from './api';

export const voiceAPI = {
  // Send voice message
  sendVoiceMessage: async (formData: FormData) => {
    const response = await api.post('/voice/send', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Get voice messages with a user
  getConversation: async (userId: string) => {
    const response = await api.get(`/voice/conversation/${userId}`);
    return response.data;
  },

  // Mark voice message as listened
  markAsListened: async (messageId: string) => {
    const response = await api.post(`/voice/${messageId}/listen`);
    return response.data;
  },

  // Get unread voice message count
  getUnreadCount: async () => {
    const response = await api.get('/voice/unread-count');
    return response.data;
  },

  // Delete voice message
  deleteVoiceMessage: async (messageId: string) => {
    const response = await api.delete(`/voice/${messageId}`);
    return response.data;
  },

  // Transcribe voice message
  transcribe: async (messageId: string) => {
    const response = await api.post(`/voice/${messageId}/transcribe`);
    return response.data;
  },

  // Add voice comment to post
  addVoiceComment: async (postId: string, formData: FormData) => {
    const response = await api.post(`/voice/comment/${postId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

export default voiceAPI;
