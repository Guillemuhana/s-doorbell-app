// src/utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('sdoorbell_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: handle 401 ────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['sdoorbell_token', 'sdoorbell_user']);
      // Navigation to login will be handled by the auth context
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// ─── Web Push API (PWA) ───────────────────────────────────────────────────────
export const pushAPI = {
  getVapidKey: () => api.get('/push/vapid-public-key'),
  subscribe: (subscription) => api.post('/push/subscribe', { subscription }),
  unsubscribe: () => api.post('/push/unsubscribe'),
};

// ─── Usuario API ──────────────────────────────────────────────────────────────
export const usuarioAPI = {
  get: (id) => api.get(`/usuarios/${id}`),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  uploadFoto: (id, formData) =>
    api.post(`/usuarios/${id}/foto-fachada`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  savePushToken: (id, pushToken) => api.post(`/usuarios/${id}/push-token`, { pushToken }),
  getQR: (id) => api.get(`/usuarios/${id}/qr`),
  regenerarQR: (id) => api.post(`/usuarios/${id}/regenerar-qr`),
};

// ─── Direcciones API ──────────────────────────────────────────────────────────
export const direccionesAPI = {
  list: () => api.get('/direcciones'),
  get: (id) => api.get(`/direcciones/${id}`),
  create: (data) => api.post('/direcciones', data),
  update: (id, data) => api.put(`/direcciones/${id}`, data),
  delete: (id) => api.delete(`/direcciones/${id}`),
  uploadFoto: (id, formData) =>
    api.post(`/direcciones/${id}/foto`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  // Timbres de la dirección
  crearTimbre: (id, data) => api.post(`/direcciones/${id}/timbres`, data),
  // Familiares / invitaciones
  getFamiliares: (id) => api.get(`/direcciones/${id}/familiares`),
  invitar: (id, data) => api.post(`/direcciones/${id}/invitaciones`, data),
  eliminarFamiliar: (id, membershipId) =>
    api.delete(`/direcciones/${id}/familiares/${membershipId}`),
};

// ─── Timbres API ──────────────────────────────────────────────────────────────
export const timbresAPI = {
  get: (id) => api.get(`/timbres/${id}`),
  update: (id, data) => api.put(`/timbres/${id}`, data),
  delete: (id) => api.delete(`/timbres/${id}`),
  getQR: (id) => api.get(`/timbres/${id}/qr`),
  regenerarQR: (id) => api.post(`/timbres/${id}/regenerar-qr`),
};

// ─── Invitaciones API ─────────────────────────────────────────────────────────
export const invitacionesAPI = {
  get: (token) => api.get(`/invitaciones/${token}`),
  aceptar: (token) => api.post(`/invitaciones/${token}/aceptar`),
  rechazar: (token) => api.post(`/invitaciones/${token}/rechazar`),
};

// ─── Eventos API ──────────────────────────────────────────────────────────────
export const eventosAPI = {
  getHistorial: (userId, params = {}) =>
    api.get(`/eventos/historial/${userId}`, { params }),
  getStats: (userId) => api.get(`/eventos/stats/${userId}`),
  getRecientes: (since) => api.get('/eventos/recientes', { params: since ? { since } : {} }),
  delete: (id) => api.delete(`/eventos/${id}`),
  deleteAll: (tipo) => api.delete('/eventos', { params: tipo ? { tipo } : {} }),
};

// ─── Notificaciones API ───────────────────────────────────────────────────────
export const notificacionesAPI = {
  guardarToken: (pushToken) => api.post('/notificaciones/guardar-token', { pushToken }),
  testNotification: () => api.post('/notificaciones/test'),
};

// ─── Videollamadas API (residente) ──────────────────────────────────────────────
export const callsAPI = {
  config: () => api.get('/calls/config'),
  incoming: () => api.get('/calls/incoming'),
  accept: (callId) => api.post(`/calls/${callId}/accept`),
  reject: (callId) => api.post(`/calls/${callId}/reject`),
  signal: (callId, tipo, payload) => api.post(`/calls/${callId}/resident/signal`, { tipo, payload }),
  poll: (callId, after = 0) => api.get(`/calls/${callId}/resident/poll`, { params: { after } }),
  hangup: (callId) => api.post(`/calls/${callId}/resident/hangup`),
};

export default api;
