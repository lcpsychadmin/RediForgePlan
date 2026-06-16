import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box, Menu, MenuItem, Divider } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SettingsIcon from '@mui/icons-material/Settings';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface TopNavProps {
  onMenuClick: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleMenuClose();
  };

  const handleLogout = async () => {
    await logout();
    handleMenuClose();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
          RediForge
        </Typography>
        <Box>
          <IconButton color="inherit" onClick={handleMenuOpen}>
            <AccountCircleIcon />
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            {/* User Info */}
            <MenuItem disabled>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {user?.email || 'User'}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase' }}>
                  {user?.role}
                </Typography>
              </Box>
            </MenuItem>

            <Divider sx={{ my: 1 }} />

            {/* Navigation */}
            <MenuItem
              onClick={() => handleNavigate('/dashboard')}
              selected={isActive('/dashboard')}
              sx={{ display: 'flex', gap: 1 }}
            >
              <DashboardIcon fontSize="small" />
              <Typography variant="body2">Dashboard</Typography>
            </MenuItem>

            <MenuItem
              onClick={() => handleNavigate('/projects')}
              selected={isActive('/projects')}
              sx={{ display: 'flex', gap: 1 }}
            >
              <FolderOpenIcon fontSize="small" />
              <Typography variant="body2">Projects</Typography>
            </MenuItem>

            <MenuItem
              onClick={() => handleNavigate('/settings')}
              selected={isActive('/settings')}
              sx={{ display: 'flex', gap: 1 }}
            >
              <SettingsIcon fontSize="small" />
              <Typography variant="body2">Settings</Typography>
            </MenuItem>

            {/* Admin Section */}
            {user?.role === 'admin' && (
              <>
                <Divider sx={{ my: 1 }} />
                <MenuItem
                  onClick={() => handleNavigate('/admin/users')}
                  selected={isActive('/admin/users')}
                  sx={{ display: 'flex', gap: 1 }}
                >
                  <AdminPanelSettingsIcon fontSize="small" />
                  <Typography variant="body2">User Management</Typography>
                </MenuItem>
              </>
            )}

            <Divider sx={{ my: 1 }} />

            {/* Logout */}
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopNav;
