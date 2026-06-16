import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Container,
  Paper,
  Link,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LocationState {
  userId?: string;
}

const MFAChallenge: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyMFA, loading, error } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as LocationState;
    if (!state?.userId) {
      navigate('/login');
    } else {
      setUserId(state.userId);
    }
  }, [location.state, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!userId) {
      setFormError('User ID not found');
      return;
    }

    try {
      await verifyMFA(userId, token);
      navigate('/dashboard');
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'MFA verification failed');
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" component="h1" sx={{ mb: 1, textAlign: 'center' }}>
            Two-Factor Authentication
          </Typography>

          <Typography variant="body2" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
            Enter the 6-digit code from your authenticator app
          </Typography>

          {(formError || error) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError || error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Authentication Code"
              placeholder="000000"
              value={token}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setToken(value);
              }}
              margin="normal"
              required
              disabled={loading}
              inputProps={{
                maxLength: 6,
                pattern: '[0-9]*',
                autoComplete: 'one-time-code',
              }}
            />

            <Button
              fullWidth
              variant="contained"
              color="primary"
              type="submit"
              sx={{ mt: 3 }}
              disabled={loading || token.length !== 6}
            >
              {loading ? <CircularProgress size={24} /> : 'Verify'}
            </Button>

            <Button
              fullWidth
              variant="text"
              sx={{ mt: 2 }}
              onClick={handleBackToLogin}
              disabled={loading}
            >
              Back to Login
            </Button>
          </form>

          <Typography variant="body2" sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
            Don&apos;t have your authenticator app set up?{' '}
            <Link href="/contact-admin" underline="always">
              Contact your administrator
            </Link>
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default MFAChallenge;
