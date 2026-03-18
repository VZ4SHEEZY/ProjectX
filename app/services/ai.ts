import api from './api';

export const aiAPI = {
  // Generate post caption
  generateCaption: async (topic: string, mood: string = 'cyberpunk', style?: string) => {
    const response = await api.post('/ai/generate-caption', { topic, mood, style });
    return response.data;
  },

  // Generate bio
  generateBio: async (persona: string, interests?: string, faction?: string) => {
    const response = await api.post('/ai/generate-bio', { persona, interests, faction });
    return response.data;
  },

  // Generate image description
  generateImageDescription: async (imageUrl: string, style?: string) => {
    const response = await api.post('/ai/generate-image-description', { imageUrl, style });
    return response.data;
  },

  // Generate DALL-E image
  generateImage: async (prompt: string, size: string = '1024x1024') => {
    const response = await api.post('/ai/generate-image', { prompt, size });
    return response.data;
  },

  // Chat assistant
  chatAssistant: async (message: string, context?: any) => {
    const response = await api.post('/ai/chat-assistant', { message, context });
    return response.data;
  },

  // Suggest reply options
  suggestReplies: async (comment: string, tone: string = 'friendly') => {
    const response = await api.post('/ai/suggest-replies', { comment, tone });
    return response.data;
  },

  // Moderate content
  moderateContent: async (content: string) => {
    const response = await api.post('/ai/moderate', { content });
    return response.data;
  }
};

export default aiAPI;
