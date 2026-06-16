import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress, Alert, useTheme } from '@mui/material';
import apiClient from '../api/client';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { palette } from '../theme/palette';

const Home: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/auth/me');
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
        <Typography
          variant="h3"
          component="h1"
          sx={{
            mb: 3,
            color: palette.text.primary,
            fontWeight: 700,
          }}
        >
          Welcome, {user?.email}
        </Typography>

        <Card
          sx={{
            mb: 3,
            backgroundColor: palette.background.paper,
            backgroundImage: 'none',
            border: `1px solid ${palette.divider}`,
          }}
        >
          <CardContent>
            <Typography
              variant="subtitle1"
              sx={{
                color: palette.text.secondary,
                mb: 2,
                fontWeight: 600,
              }}
            >
              Account Information
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mb: 1.5,
                color: palette.text.primary,
              }}
            >
              <strong>Email:</strong> {user?.email}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mb: 1.5,
                color: palette.text.primary,
              }}
            >
              <strong>Role:</strong> {user?.role}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: palette.text.primary,
              }}
            >
              <strong>MFA Status:</strong>{' '}
              <span style={{ color: user?.mfa_enabled ? palette.success.main : palette.warning.main }}>
                {user?.mfa_enabled ? '✓ Enabled' : '✗ Not Enabled'}
              </span>
            </Typography>
          </CardContent>
        </Card>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {data && (
          <Card
            sx={{
              backgroundColor: palette.background.paper,
              backgroundImage: 'none',
              border: `1px solid ${palette.divider}`,
            }}
          >
            <CardContent>
              <Typography
                variant="subtitle1"
                sx={{
                  color: palette.text.secondary,
                  mb: 1,
                  fontWeight: 600,
                }}
              >
                Server Status
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  color: palette.success.main,
                  fontWeight: 700,
                }}
              >
                {data.status || 'OK'}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  mt: 2,
                  color: palette.text.secondary,
                }}
              >
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
