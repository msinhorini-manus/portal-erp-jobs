/**
 * Admin API Service
 * Handles all admin-related API calls
 */

const API_BASE_URL = 'https://portal-erp-jobs-production.up.railway.app/api/admin';

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const adminAPI = {
  // Statistics
  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/stats`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  // Tags
  getTags: async () => {
    const response = await fetch(`${API_BASE_URL}/tags`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch tags');
    return response.json();
  },

  createTag: async (data) => {
    const response = await fetch(`${API_BASE_URL}/tags`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create tag');
    return response.json();
  },

  updateTag: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update tag');
    return response.json();
  },

  deleteTag: async (id) => {
    const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete tag');
    return response.json();
  },

  // Users
  getUsers: async (page = 1, perPage = 20, type = null) => {
    let url = `${API_BASE_URL}/users?page=${page}&per_page=${perPage}`;
    if (type) url += `&type=${type}`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  deleteUser: async (id) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete user');
    return response.json();
  },

  toggleUserActive: async (id) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}/toggle-active`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to toggle user status');
    return response.json();
  },

  // Jobs
  getJobs: async (page = 1, perPage = 20, status = null) => {
    let url = `${API_BASE_URL}/jobs?page=${page}&per_page=${perPage}`;
    if (status) url += `&status=${status}`;
    
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch jobs');
    return response.json();
  },

  deleteJob: async (id) => {
    const response = await fetch(`${API_BASE_URL}/jobs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete job');
    return response.json();
  }
};

