import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress, Alert } from '@mui/material';
import apiClient from '../api/client';
import Layout from '../components/Layout';

const Home: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/health');
        setData(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Layout>
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
          Dashboard
        </Typography>

        {loading && <CircularProgress />}

        {error && <Alert severity="error">{error}</Alert>}

        {data && (
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Server Status
              </Typography>
              <Typography variant="h5">{data.status || 'OK'}</Typography>
              <Typography variant="body2" sx={{ mt: 2 }}>
                {data.message || 'Backend connection established'}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </Layout>
  );
};

export default Home;
