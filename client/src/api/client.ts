// client/src/api/client.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import { parseApiError } from './errorHandler';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/';

/**
 * Create Axios instance with base configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/**
 * Callback for handling logout
 */
let logoutCallback: (() => void) | null = null;

/**
 * Register logout callback from AuthContext
 */
export function setLogoutCallback(callback: () => void): void {
  logoutCallback = callback;
}

/**
 * Request interceptor: attach JWT token
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor: normalize errors and handle auth
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      
      // Call logout callback if registered
      if (logoutCallback) {
        logoutCallback();
      } else {
        // Fallback redirect
        window.location.href = '/login';
      }
    }

    // Log error details in development
    if (import.meta.env.DEV) {
      console.error('[API Error]', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        url: error.config?.url,
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
