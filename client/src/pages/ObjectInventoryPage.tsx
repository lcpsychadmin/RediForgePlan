import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const ObjectInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isCatalogView = location.pathname.startsWith('/object-inventory/catalog');

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2.5 }}>
          Object Inventory
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            variant={isCatalogView ? 'contained' : 'outlined'}
            size="small"
            sx={{ textTransform: 'none', borderRadius: 10, px: 1.8 }}
            onClick={() => navigate('/object-inventory/catalog')}
          >
            Object Catalog
          </Button>
          <Button
            variant={!isCatalogView ? 'contained' : 'outlined'}
            size="small"
            sx={{ textTransform: 'none', borderRadius: 10, px: 1.8 }}
            onClick={() => navigate('/object-inventory/project')}
          >
            Project Inventory
          </Button>
        </Box>

        <Outlet />
      </Box>
    </Layout>
  );
};

export default ObjectInventoryPage;
