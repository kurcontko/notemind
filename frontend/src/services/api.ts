// frontend/src/services/api.ts
import axios from 'axios';

const getBaseUrl = () => {
  // For Vite, use import.meta.env instead of process.env
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Default to localhost in development
  if (import.meta.env.DEV) {
    return 'http://localhost:8000/api/v1';
  }
  
  return '/api/v1';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Accept': 'application/json',
  },
});

// Add response/error interceptors if needed
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors (401, 403, etc.)
    return Promise.reject(error);
  }
);