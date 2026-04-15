// src/api.js
import axios from 'axios';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:10000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: add token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle errors without redirecting to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log the error for debugging, but do not redirect
    console.error('API Error:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

export default api;
