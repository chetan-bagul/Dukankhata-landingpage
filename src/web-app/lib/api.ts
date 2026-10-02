import axios from 'axios';

export const API_BASE_URL = 'https://api.dukankhata.in/api/v1/';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const isPublicAuth = config.url?.includes('auth/login') || config.url?.includes('auth/signup');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!isPublicAuth && token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('auth/')) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);
