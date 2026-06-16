import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box, Menu, MenuItem, Divider, Button } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SettingsIcon from '@mui/icons-material/Settings';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import StorageIcon from '@mui/icons-material/Storage';
import GroupIcon from '@mui/icons-material/Group';
import DownloadIcon from '@mui/icons-material/Download';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface TopNavProps {
  onMenuClick: () => void;
  programCount?: number;
  objectCount?: number;
  completionPercentage?: number;
  onPeopleClick?: () => void;
  onExportClick?: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ 
  onMenuClick, 
  programCount = 0, 
  objectCount = 0, 
  completionPercentage = 0,
  onPeopleClick,
  onExportClick
}) => {
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
        {/* Left: Icon and Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <StorageIcon sx={{ fontSize: '1.5rem' }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
            Migration Plan
          </Typography>
        </Box>

        {/* Center: Stats */}
        <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center', borderLeft: '1px solid', borderColor: 'rgba(255, 255, 255, 0.2)', pl: 3, ml: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption">
              Programs:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {programCount}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption">
              Objects:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {objectCount}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.light' }}>
              {completionPercentage}%
            </Typography>
          </Box>
        </Box>

        {/* Right: Buttons and Menu */}
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mr: 2 }}>
          <Button
            variant="text"
            size="small"
            startIcon={<GroupIcon />}
            onClick={onPeopleClick}
            sx={{ textTransform: 'none', fontWeight: 500, color: 'white' }}
          >
            People
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={onExportClick}
            sx={{ textTransform: 'none', fontWeight: 500 }}
          >
            Export CSV
          </Button>
        </Box>

        {/* Account Menu */}
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
