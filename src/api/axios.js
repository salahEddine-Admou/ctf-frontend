import axios from 'axios';
import { getApiBaseUrl } from '../utils/apiBase.js';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    if (status === 429) {
      error.userMessage = message || 'Trop de requêtes. Patientez quelques secondes puis réessayez.';
    }

    if (status === 504) {
      error.userMessage =
        message || 'Le serveur met trop de temps à répondre. Réessayez dans quelques secondes.';
    }

    return Promise.reject(error);
  }
);

export default api;
