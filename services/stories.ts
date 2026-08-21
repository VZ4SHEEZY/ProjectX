import api from './api';

export const storiesAPI = {
  // Get stories feed (from followed users)
  getFeed: async () => {
    const response = await api.get('/stories/feed');
    return response.data;
  },

  // Get my stories
  getMyStories: async () => {
    const response = await api.get('/stories/my-stories');
    return response.data;
  },

  // Get stories from specific user
  getUserStories: async (userId: string) => {
    const response = await api.get(`/stories/user/${userId}`);
    return response.data;
  },

  // Create new story
  createStory: async (mediaUrl: string, mediaType: 'image' | 'video', caption?: string) => {
    const response = await api.post('/stories', { mediaUrl, mediaType, caption });
    return response.data;
  },

  // View a story
  viewStory: async (storyId: string) => {
    const response = await api.post(`/stories/${storyId}/view`);
    return response.data;
  },

  // React to story
  reactToStory: async (storyId: string, reaction: string) => {
    const response = await api.post(`/stories/${storyId}/react`, { reaction });
    return response.data;
  },

  // Reply to story
  replyToStory: async (storyId: string, message: string) => {
    const response = await api.post(`/stories/${storyId}/reply`, { message });
    return response.data;
  },

  // Delete story
  deleteStory: async (storyId: string) => {
    const response = await api.delete(`/stories/${storyId}`);
    return response.data;
  },

  // Get story viewers
  getStoryViewers: async (storyId: string) => {
    const response = await api.get(`/stories/${storyId}/viewers`);
    return response.data;
  },

  // Get story stats
  getStoryStats: async (storyId: string) => {
    const response = await api.get(`/stories/${storyId}/stats`);
    return response.data;
  }
};

export default storiesAPI;
