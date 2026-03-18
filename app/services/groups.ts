import api from './api';

export const groupsAPI = {
  // Get all groups
  getGroups: async (params?: { category?: string; search?: string; sort?: string }) => {
    const response = await api.get('/groups', { params });
    return response.data;
  },

  // Get my groups
  getMyGroups: async () => {
    const response = await api.get('/groups/my-groups');
    return response.data;
  },

  // Get group by ID
  getGroup: async (groupId: string) => {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },

  // Create new group
  createGroup: async (
    name: string, 
    description?: string, 
    category?: string, 
    isPrivate?: boolean,
    tags?: string[]
  ) => {
    const response = await api.post('/groups', {
      name,
      description,
      category,
      isPrivate,
      tags
    });
    return response.data;
  },

  // Join group
  joinGroup: async (groupId: string) => {
    const response = await api.post(`/groups/${groupId}/join`);
    return response.data;
  },

  // Leave group
  leaveGroup: async (groupId: string) => {
    const response = await api.post(`/groups/${groupId}/leave`);
    return response.data;
  },

  // Approve join request (admin only)
  approveRequest: async (groupId: string, userId: string) => {
    const response = await api.post(`/groups/${groupId}/approve`, { userId });
    return response.data;
  },

  // Update group (admin only)
  updateGroup: async (groupId: string, updates: any) => {
    const response = await api.put(`/groups/${groupId}`, updates);
    return response.data;
  },

  // Delete group (creator only)
  deleteGroup: async (groupId: string) => {
    const response = await api.delete(`/groups/${groupId}`);
    return response.data;
  },

  // Get group categories
  getCategories: async () => {
    const response = await api.get('/groups/categories/list');
    return response.data;
  }
};

export default groupsAPI;
