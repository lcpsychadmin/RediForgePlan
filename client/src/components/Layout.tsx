import React from 'react';
import { Box, Container } from '@mui/material';
import TopNav from './TopNav';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 260;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* TopNav at top */}
      <TopNav onMenuClick={() => {}} />
      
      {/* Sidebar (fixed, doesn't participate in flex) */}
      <Sidebar open={true} onClose={() => {}} />
      
      {/* Main Content Area - below header, to the right of sidebar */}
      <Box
        component="main"
        sx={{
          mt: '64px',
          ml: `${DRAWER_WIDTH}px`,
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
