import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute';
import { setLogoutCallback } from './api/client';
import queryClient from './api/queryClient';
import theme from './theme/theme';

// Pages
import Login from './pages/Login';
import MFA from './pages/MFA';
import Home from './pages/Home';
import AdminUsers from './pages/AdminUsers';
import ProjectsPage from './pages/ProjectsPage';
import SettingsPage from './pages/SettingsPage';
import PlanPage from './pages/PlanPage';
import InventoryPage from './pages/InventoryPage';
import PrioritiesPage from './pages/PrioritiesPage';
import SchedulePage from './pages/SchedulePage';

// Layout
import ProjectLayout from './layout/ProjectLayout';

// Redirect component for authenticated users trying to access login
const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

/**
 * Component that registers logout callback from AuthContext
 * Must be inside QueryClientProvider and after AuthProvider
 */
const LogoutCallbackRegistration: React.FC = () => {
  const { logout } = useAuth();

  useEffect(() => {
    // Register logout callback for 401 responses
    setLogoutCallback(logout);
  }, [logout]);

  return null;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <AuthRedirect>
            <Login />
          </AuthRedirect>
        }
      />
      <Route
        path="/mfa"
        element={
          <AuthRedirect>
            <MFA />
          </AuthRedirect>
        }
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Project workspace routes */}
      <Route
        path="/programs/:programId/mock-cycles/:mockCycleId/projects/:projectId"
        element={
          <ProtectedRoute>
            <ProjectLayout>
              <PlanPage />
            </ProjectLayout>
          </ProtectedRoute>
        }
      >
        <Route path="plan" element={<PlanPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="priorities" element={<PrioritiesPage />} />
        <Route path="schedule" element={<SchedulePage />} />
      </Route>

      <Route
        path="/programs/:programId/mock-cycles/:mockCycleId/projects/:projectId/plan"
        element={
          <ProtectedRoute>
            <ProjectLayout>
              <PlanPage />
            </ProjectLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/programs/:programId/mock-cycles/:mockCycleId/projects/:projectId/inventory"
        element={
          <ProtectedRoute>
            <ProjectLayout>
              <InventoryPage />
            </ProjectLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/programs/:programId/mock-cycles/:mockCycleId/projects/:projectId/priorities"
        element={
          <ProtectedRoute>
            <ProjectLayout>
              <PrioritiesPage />
            </ProjectLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/programs/:programId/mock-cycles/:mockCycleId/projects/:projectId/schedule"
        element={
          <ProtectedRoute>
            <ProjectLayout>
              <SchedulePage />
            </ProjectLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <RoleRoute role="admin">
              <AdminUsers />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <LogoutCallbackRegistration />
            <AppRoutes />
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
