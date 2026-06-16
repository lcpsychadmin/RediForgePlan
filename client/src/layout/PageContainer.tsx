// client/src/layout/PageContainer.tsx

import React from 'react';
import { Box, Container, useTheme } from '@mui/material';
import { palette } from '../theme/palette';

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
}

const PageContainer: React.FC<PageContainerProps> = ({ children, maxWidth = 'lg' }) => {
  const theme = useTheme();

  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: palette.background.default,
      }}
    >
      <Container
        maxWidth={maxWidth}
        sx={{
          py: 3,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Container>
    </Box>
  );
};

export default PageContainer;
