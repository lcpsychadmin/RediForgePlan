import React from 'react';
import { Box, Container } from '@mui/material';
import TopNav from './TopNav';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* TopNav at top */}
      <TopNav onMenuClick={() => {}} />
      
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
