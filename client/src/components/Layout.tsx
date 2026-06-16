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
      
      {/* Below TopNav: Sidebar + Main Content */}
      <Box sx={{ display: 'flex', flex: 1 }}>
        {/* Permanent Sidebar */}
        <Sidebar open={true} onClose={() => {}} />
        
        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            ml: `${DRAWER_WIDTH}px`,
            width: `calc(100% - ${DRAWER_WIDTH}px)`,
            overflow: 'auto',
          }}
        >
          <Container maxWidth="lg">{children}</Container>
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
