import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute - Requires authentication
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  console.log('ProtectedRoute: isAuthenticated=', isAuthenticated, 'loading=', loading);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

interface RoleRouteProps {
  children: React.ReactNode;
  role: string | string[];
}

/**
 * RoleRoute - Requires specific role(s)
 */
export const RoleRoute: React.FC<RoleRouteProps> = ({ children, role }) => {
  const { user, loading } = useAuth();
  const allowedRoles = Array.isArray(role) ? role : [role];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

interface PermissionRouteProps {
  children: React.ReactNode;
  permission: (user: any) => boolean;
}

/**
 * PermissionRoute - Custom permission check
 */
export const PermissionRoute: React.FC<PermissionRouteProps> = ({ children, permission }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user || !permission(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
