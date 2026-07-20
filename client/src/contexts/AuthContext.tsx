import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../api/client';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  mfa_enabled: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  // Auth flow
  login: (email: string, password: string) => Promise<{ requiresMFA: boolean; userId?: string }>;
  verifyMFA: (userId: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  // MFA setup
  setupMFA: (email: string) => Promise<{ secret: string; qrCodeImage: string }>;
  enableMFA: (secret: string, token: string) => Promise<void>;
  // Admin
  createUser: (email: string, password: string, role: string) => Promise<any>;
  // Utils
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);  // Start as true so we wait for auth to initialize
  const [error, setError] = useState<string | null>(null);

  // Initialize auth from localStorage on mount
  useEffect(() => {
    const autoLoginEnabled = String(import.meta.env.VITE_AUTO_LOGIN_ENABLED || '').toLowerCase() === 'true';

    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          setLoading(true);
          // Verify token is still valid
          const response = await apiClient.get('/auth/me');
          setUser(response.data);
        } else if (autoLoginEnabled) {
          setLoading(true);
          const response = await apiClient.post('/auth/auto-login');
          if (response.data?.token && response.data?.user) {
            localStorage.setItem('authToken', response.data.token);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
            setUser(response.data.user);
          }
        }
      } catch (err) {
        localStorage.removeItem('authToken');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ requiresMFA: boolean; userId?: string }> => {
    try {
      setError(null);
      setLoading(true);

      const response = await apiClient.post('/auth/login', { email, password });

      // If MFA is not required and token is provided, log in directly
      if (!response.data.mfaRequired && response.data.token) {
        // Store JWT token
        localStorage.setItem('authToken', response.data.token);

        // Update API client default header
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

        // Set user
        setUser(response.data.user);

        return {
          requiresMFA: false,
        };
      }

      // Store userId temporarily for MFA verification
      if (response.data.userId) {
        sessionStorage.setItem('pendingMFAUserId', response.data.userId);
      }

      return {
        requiresMFA: response.data.mfaRequired,
        userId: response.data.userId,
      };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyMFA = async (userId: string, token: string): Promise<void> => {
    try {
      setError(null);
      setLoading(true);

      const response = await apiClient.post('/auth/mfa/verify', { userId, token });

      // Store JWT token
      localStorage.setItem('authToken', response.data.token);

      // Update API client default header
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

      // Set user
      setUser(response.data.user);

      // Clear temporary session storage
      sessionStorage.removeItem('pendingMFAUserId');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'MFA verification failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      if (token) {
        await apiClient.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      localStorage.removeItem('authToken');
      delete apiClient.defaults.headers.common['Authorization'];
      setUser(null);
    } catch (err: any) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const setupMFA = async (email: string): Promise<{ secret: string; qrCodeImage: string }> => {
    try {
      setError(null);
      const response = await apiClient.post('/auth/mfa/setup', { email });
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'MFA setup failed';
      setError(errorMessage);
      throw err;
    }
  };

  const enableMFA = async (secret: string, token: string): Promise<void> => {
    try {
      setError(null);
      setLoading(true);

      const authToken = localStorage.getItem('authToken');
      await apiClient.post(
        '/auth/mfa/enable',
        { secret, token },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      // Update user MFA status
      if (user) {
        setUser({ ...user, mfa_enabled: true });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to enable MFA';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (
    email: string,
    password: string,
    role: string
  ): Promise<any> => {
    try {
      setError(null);
      setLoading(true);

      const authToken = localStorage.getItem('authToken');
      const response = await apiClient.post(
        '/auth/admin/create-user',
        { email, password, role },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    verifyMFA,
    logout,
    setupMFA,
    enableMFA,
    createUser,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
