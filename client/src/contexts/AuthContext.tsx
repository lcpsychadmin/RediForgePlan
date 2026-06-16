import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  user: null | { id: string; email: string; name: string };
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    // TODO: Implement login logic in Prompt 1
    setLoading(true);
    try {
      console.log('Login placeholder:', { email });
      // Add actual login implementation here
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // TODO: Implement logout logic in Prompt 1
    setLoading(true);
    try {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
