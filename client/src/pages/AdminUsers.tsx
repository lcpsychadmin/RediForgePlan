import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Layout from '../components/Layout';
import CreateUserModal from '../components/CreateUserModal';

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

const AdminUsers: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleUserCreated = (userData: any) => {
    // Add new user to list
    const newUser: User = {
      id: userData.user.id,
      email: userData.user.email,
      role: userData.user.role,
      created_at: userData.user.created_at,
    };

    setUsers([...users, newUser]);
    setSuccessMessage(`User ${userData.user.email} created successfully with MFA QR code`);

    // Clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000);

    // Keep modal open to show MFA setup instructions
  };

  const getRoleColor = (role: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'analyst':
        return 'info';
      case 'viewer':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Layout>
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            User Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenModal(true)}
          >
            Create User
          </Button>
        </Box>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        <Paper>
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="textSecondary">
                        No users created yet. Click "Create User" to add one.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.role}
                          color={getRoleColor(user.role)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper sx={{ p: 3, mt: 3, backgroundColor: '#f9f9f9' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            User Roles:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 1 }}>
            <li>
              <strong>Admin</strong> - Full access including user management
            </li>
            <li>
              <strong>Analyst</strong> - Can analyze data and access reports
            </li>
            <li>
              <strong>Viewer</strong> - Read-only access to reports
            </li>
          </Typography>
          <Typography variant="caption" color="textSecondary">
            All users are required to set up TOTP MFA on first login.
          </Typography>
        </Paper>
      </Box>

      <CreateUserModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onUserCreated={handleUserCreated}
      />
    </Layout>
  );
};

export default AdminUsers;
