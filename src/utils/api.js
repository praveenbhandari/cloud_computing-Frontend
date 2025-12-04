import { awsConfig } from '../config/aws-config';

const API_URL = awsConfig.api.endpoint;

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// API client
export const api = {
  // Auth endpoints
  register: async (email, password) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
    return response.json();
  },

  login: async (email, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    const data = await response.json();
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userEmail', data.email);
    return data;
  },

  logout: async () => {
    const token = getAuthToken();
    if (token) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        console.error('Logout error:', e);
      }
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
  },

  // Vault endpoints
  listVaults: async () => {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/vaults`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to load vaults');
    const data = await response.json();
    return data.vaults;
  },

  createVault: async (vault) => {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/vaults`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(vault)
    });
    if (!response.ok) throw new Error('Failed to create vault');
    const data = await response.json();
    return data.vault;
  },

  getVault: async (id) => {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/vaults/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to load vault');
    const data = await response.json();
    return data.vault;
  },

  updateVault: async (id, updates) => {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/vaults/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update vault');
    const data = await response.json();
    return data.vault;
  },

  deleteVault: async (id) => {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/vaults/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to delete vault');
  }
};

export const vaultsAPI = api;

