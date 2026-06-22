import React from 'react';
import { Box, Typography } from '@mui/material';
import TopNav from './TopNav';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  programCount?: number;
  cycleCount?: number;
  objectCount?: number;
  completionPercentage?: number;
  tabValue?: number;
  onTabChange?: (value: number) => void;
  onPeopleClick?: () => void;
  onMenuClick?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children,
  programCount = 0,
  cycleCount = 0,
  objectCount = 0,
  completionPercentage = 0,
  tabValue = 0,
  onTabChange,
  onPeopleClick,
  onMenuClick
}) => {
  const location = useLocation();
  const { user } = useAuth();
  const isWorkspacePage = location.pathname === '/projects' || location.pathname === '/planning';

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  const displayName = user?.email?.split('@')[0] || 'User';
  const capitalized = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  return (
    <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column', overflow: 'hidden' }}>
      <TopNav 
        onMenuClick={onMenuClick || (() => {})} 
        programCount={programCount}
        cycleCount={cycleCount}
        objectCount={objectCount}
        completionPercentage={completionPercentage}
        tabValue={tabValue}
        onTabChange={onTabChange}
        onPeopleClick={onPeopleClick}
      />
      
      <Box
        component="main"
        sx={{
          mt: isWorkspacePage ? { xs: '112px', sm: '120px' } : '64px',
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          p: isWorkspacePage ? 0 : 3,
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          flexShrink: 0,
          height: '36px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          px: 2,
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="caption" color="text.disabled">
          Welcome, {capitalized}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {dateStr} · {timeStr}
        </Typography>
      </Box>
    </Box>
  );
};

export default Layout;
