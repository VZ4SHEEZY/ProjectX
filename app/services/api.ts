import axios, { AxiosError, AxiosInstance } from 'axios';

// API Configuration - Hardcoded URL with trailing slash
const API_BASE_URL = 'https://cyberdope-api.onrender.com/api/'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cdToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cdToken');
      localStorage.removeItem('cdUser');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================
export const authAPI = {
  register: (data: { username: string; email: string; password: string; displayName?: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  getMe: () =>
    api.get('/auth/me'),

  verifyAge: () =>
    api.post('/auth/verify-age'),
};

// ==================== USER API ====================
export const userAPI = {
  getUsers: (params?: { search?: string; faction?: string; isCreator?: boolean; page?: number; limit?: number }) =>
    api.get('/users', { params }),

  getSuggestedUsers: () =>
    api.get('/users/suggested'),

  getUser: (username: string) =>
    api.get(`/users/${username}`),

  updateProfile: (data: any) =>
    api.put('/users/profile', data),

  saveProfile: (data: { bio?: string; avatar?: string; banner?: string; faction?: string; displayName?: string; location?: string; website?: string; theme?: any }) =>
    api.put('/users/profile', data),

  followUser: (userId: string) =>
    api.post(`/users/${userId}/follow`),

  unfollowUser: (userId: string) =>
    api.delete(`/users/${userId}/follow`),

  getFollowers: (userId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/users/${userId}/followers`, { params }),

  getFollowing: (userId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/users/${userId}/following`, { params }),

  getStats: (userId: string) =>
    api.get(`/users/${userId}/stats`),
};

// ==================== POST API ====================
export const postAPI = {
  getPosts: (params?: { type?: string; visibility?: string; sort?: string; page?: number; limit?: number; following?: boolean }) =>
    api.get('/posts', { params }),

  getForYouFeed: (params?: { page?: number; limit?: number }) =>
    api.get('/posts/feed/foryou', { params }),

  getFollowingFeed: (params?: { page?: number; limit?: number }) =>
    api.get('/posts/feed/following', { params }),

  getFactionFeed: (params?: { page?: number; limit?: number }) =>
    api.get('/posts/feed/faction', { params }),

  getTrending: (params?: { page?: number; limit?: number; timeframe?: string }) =>
    api.get('/posts/feed/trending', { params }),

  getPost: (id: string) =>
    api.get(`/posts/${id}`),

  createPost: (data: any) =>
    api.post('/posts', data),

  updatePost: (id: string, data: any) =>
    api.put(`/posts/${id}`, data),

  deletePost: (id: string) =>
    api.delete(`/posts/${id}`),

  likePost: (id: string) =>
    api.post(`/posts/${id}/like`),

  unlikePost: (id: string) =>
    api.delete(`/posts/${id}/like`),

  viewPost: (id: string) =>
    api.post(`/posts/${id}/view`),
};

// ==================== COMMENT API ====================
export const commentAPI = {
  getComments: (postId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/posts/${postId}/comments`, { params }),

  createComment: (postId: string, data: { content: string; parentCommentId?: string }) =>
    api.post(`/posts/${postId}/comments`, data),

  updateComment: (commentId: string, data: { content: string }) =>
    api.put(`/comments/${commentId}`, data),

  deleteComment: (commentId: string) =>
    api.delete(`/comments/${commentId}`),

  likeComment: (commentId: string) =>
    api.post(`/comments/${commentId}/like`),
};

// ==================== NOTIFICATION API ====================
export const notificationAPI = {
  getNotifications: (params?: { unreadOnly?: boolean; page?: number; limit?: number }) =>
    api.get('/notifications', { params }),

  markAsRead: (id: string) =>
    api.put(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.put('/notifications/read-all'),

  deleteNotification: (id: string) =>
    api.delete(`/notifications/${id}`),

  deleteAllRead: () =>
    api.delete('/notifications'),
};

// ==================== MESSAGE API ====================
export const messageAPI = {
  getConversations: () =>
    api.get('/messages/conversations'),

  getMessages: (userId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/messages/${userId}`, { params }),

  sendMessage: (userId: string, data: { content?: string; mediaUrl?: string; mediaType?: string }) =>
    api.post(`/messages/${userId}`, data),

  deleteMessage: (messageId: string) =>
    api.delete(`/messages/${messageId}`),

  getUnreadCount: () =>
    api.get('/messages/unread/count'),
};

// ==================== TIP & SUBSCRIPTION API ====================
export const tipAPI = {
  sendTip: (data: { recipientId: string; amount: number; message?: string; postId?: string; paymentMethod?: string }) =>
    api.post('/tips', data),

  getSentTips: (params?: { page?: number; limit?: number }) =>
    api.get('/tips/sent', { params }),

  getReceivedTips: (params?: { page?: number; limit?: number }) =>
    api.get('/tips/received', { params }),

  subscribe: (data: { creatorId: string; tierId: string; paymentMethod?: string }) =>
    api.post('/tips/subscriptions', data),

  getSubscriptions: () =>
    api.get('/tips/subscriptions'),

  purchaseContent: (data: { postId: string; paymentMethod?: string }) =>
    api.post('/tips/purchases', data),
};

// ==================== SEARCH API ====================
export const searchAPI = {
  search: (query: string, type?: 'all' | 'users' | 'posts', params?: { page?: number; limit?: number }) =>
    api.get('/search', { params: { q: query, type, ...params } }),

  getTrending: () =>
    api.get('/search/trending'),

  getSuggestions: (query: string) =>
    api.get('/search/suggestions', { params: { q: query } }),
};

// ==================== UPLOAD API ====================
export const uploadAPI = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadVideo: (file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    return api.post('/upload/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadAudio: (file: File) => {
    const formData = new FormData();
    formData.append('audio', file);
    return api.post('/upload/audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadBanner: (file: File) => {
    const formData = new FormData();
    formData.append('banner', file);
    return api.post('/upload/banner', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
