import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onUserCreated: (userData: any) => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ open, onClose, onUserCreated }) => {
  const { createUser, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [formError, setFormError] = useState<string | null>(null);
  const [mfaData, setMfaData] = useState<any>(null);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!email || !password || !role) {
      setFormError('All fields are required');
      return;
    }

    try {
      const userData = await createUser(email, password, role);
      setMfaData(userData.mfa);
      onUserCreated(userData);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user');
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setRole('viewer');
    setFormError(null);
    setMfaData(null);
    onClose();
  };

  // Show MFA setup info
  if (mfaData) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>User Created - MFA Setup Required</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>User Email:</strong> {email}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Temporary Password:</strong>
              <code
                style={{
                  display: 'block',
                  background: '#f5f5f5',
                  padding: '8px',
                  marginTop: '4px',
                  wordBreak: 'break-all',
                }}
              >
                {password}
              </code>
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              <strong>Role:</strong> {role}
            </Typography>

            <Paper sx={{ p: 2, backgroundColor: '#f9f9f9', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                MFA Setup Instructions:
              </Typography>
              <Typography variant="body2" component="ol" sx={{ pl: 2 }}>
                <li>User logs in with email and temporary password</li>
                <li>User scans this QR code with authenticator app (Google Authenticator, Microsoft Authenticator, etc.)</li>
                <li>User enters 6-digit code to enable MFA</li>
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <img
                  src={mfaData.qrCodeImage}
                  alt="MFA QR Code"
                  style={{ maxWidth: '200px', height: '200px' }}
                />
              </Box>
              <Typography variant="caption" sx={{ display: 'block', textAlign: 'center' }}>
                Or enter manually: <code>{mfaData.secret}</code>
              </Typography>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New User</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(formError || error) && <Alert severity="error">{formError || error}</Alert>}

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            disabled={loading}
          />

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              label="Temporary Password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              disabled={loading}
            />
            <Button onClick={generatePassword} variant="outlined" sx={{ mt: 1 }}>
              Generate
            </Button>
          </Box>

          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select value={role} onChange={(e) => setRole(e.target.value)} label="Role" disabled={loading}>
              <MenuItem value="viewer">Viewer</MenuItem>
              <MenuItem value="analyst">Analyst</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="caption" color="textSecondary">
            The user will need to scan the MFA QR code with their authenticator app after first login.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !email || !password}
        >
          {loading ? <CircularProgress size={24} /> : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateUserModal;
