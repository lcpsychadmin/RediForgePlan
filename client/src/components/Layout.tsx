import React from 'react';
import { Box } from '@mui/material';
import TopNav from './TopNav';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  programCount?: number;
  objectCount?: number;
  completionPercentage?: number;
  tabValue?: number;
  onTabChange?: (value: number) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children,
  programCount = 0,
  objectCount = 0,
  completionPercentage = 0,
  tabValue = 0,
  onTabChange
}) => {
  const location = useLocation();
  const isProjectsPage = location.pathname === '/projects';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <TopNav 
        onMenuClick={() => {}} 
        programCount={programCount}
        objectCount={objectCount}
        completionPercentage={completionPercentage}
        tabValue={tabValue}
        onTabChange={onTabChange}
      />
      
      <Box
        component="main"
        sx={{
          mt: isProjectsPage ? '120px' : '64px',
          flex: 1,
          p: 3,
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
