/**
 * API Service - Axios instance with JWT interceptors
 */
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('sari_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const code = error.response?.data?.code;
      // Force clear stale session (expired token OR user deleted from DB after migration)
      sessionStorage.removeItem('sari_token');
      sessionStorage.removeItem('sari_user');
      if (window.location.pathname !== '/login') {
        // Add a hint in the URL so the login page can show a message
        const reason = code === 'STALE_SESSION' ? '?reason=session_reset' : '';
        window.location.href = `/login${reason}`;
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data),
};

// Saree APIs
export const sareeAPI = {
  getAll: (params) => api.get('/sarees', { params }),
  getById: (id) => api.get(`/sarees/${id}`),
  advancedSearch: (params) => api.get('/sarees/search/advanced', { params }),
  create: (data) => api.post('/sarees', data),
  update: (id, data) => api.put(`/sarees/${id}`, data),
  delete: (id) => api.delete(`/sarees/${id}`),
  nextSeries: (id) => api.patch(`/sarees/${id}/next-series`),
  setSeries: (id, data) => api.patch(`/sarees/${id}/set-series`, data),
};

// Beam APIs
export const beamAPI = {
  add: (sareeId, data) => api.post(`/sarees/${sareeId}/beams`, data),
  update: (beamId, data) => api.put(`/sarees/beams/${beamId}`, data),
  delete: (beamId) => api.delete(`/sarees/beams/${beamId}`),
};

// Combination APIs
export const combinationAPI = {
  add: (beamId, data) => api.post(`/sarees/beams/${beamId}/combinations`, data),
  update: (comboId, data) => api.put(`/sarees/combinations/${comboId}`, data),
  delete: (comboId) => api.delete(`/sarees/combinations/${comboId}`),
};

// Combination Image APIs
export const combinationImageAPI = {
  upload: (comboId, file, { seriesCode = '', beamName = '' } = {}) => {
    const formData = new FormData();
    formData.append('image', file);
    const params = new URLSearchParams();
    if (seriesCode) params.set('seriesCode', seriesCode);
    if (beamName) params.set('beamName', beamName);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.post(`/upload/combination/${comboId}${query}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (comboId) => api.delete(`/upload/combination/${comboId}`),
};

// Parser API
export const parserAPI = {
  parseWhatsApp: (message) => api.post('/parser/whatsapp', { message }),
  simulateWebhook: (message) => api.post('/parser/whatsapp-webhook', { message }),
};

// Stock APIs
export const stockAPI = {
  update: (data) => api.patch('/stock/update', data),
  undo: (historyId) => api.patch(`/stock/undo/${historyId}`),
  getHistory: (params) => api.get('/stock/history', { params }),
};

// Dashboard APIs
export const dashboardAPI = {
  get: (params) => api.get('/dashboard', { params }),
  predict: (params) => api.get('/dashboard/predict', { params }),
};


// Settings APIs
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

// Upload APIs
export const uploadAPI = {
  image: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// Supplier APIs
export const supplierAPI = {
  getAll: () => api.get('/suppliers'),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
  getByCombo: (comboId) => api.get(`/suppliers/combination/${comboId}`),
  linkToCombo: (comboId, data) => api.post(`/suppliers/combination/${comboId}`, data),
  unlinkFromCombo: (comboId, supplierId) => api.delete(`/suppliers/combination/${comboId}/${supplierId}`),
};

// Stock Request APIs
export const stockRequestAPI = {
  getAll: (params) => api.get('/stock-requests', { params }),
  create: (data) => api.post('/stock-requests', data),
  updateStatus: (id, data) => api.patch(`/stock-requests/${id}/status`, data),
  delete: (id) => api.delete(`/stock-requests/${id}`),
};

export default api;
