import React from 'react';
import { Box, Container } from '@mui/material';
import TopNav from './TopNav';

interface LayoutProps {
  children: React.ReactNode;
  programCount?: number;
  objectCount?: number;
  completionPercentage?: number;
}

const Layout: React.FC<LayoutProps> = ({ 
  children,
  programCount = 0,
  objectCount = 0,
  completionPercentage = 0
}) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* TopNav at top */}
      <TopNav 
        onMenuClick={() => {}} 
        programCount={programCount}
        objectCount={objectCount}
        completionPercentage={completionPercentage}
      />
      
      {/* Main Content Area - full width below header */}
      <Box
        component="main"
        sx={{
          mt: '64px',
          flex: 1,
          p: 3,
          overflow: 'auto',
        }}
      >
        <Container maxWidth="lg">{children}</Container>
      </Box>
    </Box>
  );
};

export default Layout;
