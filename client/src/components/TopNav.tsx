import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box, Menu, MenuItem, Divider, Button, LinearProgress } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SettingsIcon from '@mui/icons-material/Settings';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import StorageIcon from '@mui/icons-material/Storage';
import GroupIcon from '@mui/icons-material/Group';
import DownloadIcon from '@mui/icons-material/Download';
import GridViewIcon from '@mui/icons-material/GridView';
import TableChartIcon from '@mui/icons-material/TableChart';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface TopNavProps {
  onMenuClick: () => void;
  programCount?: number;
  objectCount?: number;
  completionPercentage?: number;
  tabValue?: number;
  onTabChange?: (value: number) => void;
}

const subNavItems = [
  { label: 'Plan', icon: <GridViewIcon sx={{ fontSize: '0.95rem' }} /> },
  { label: 'Inventory', icon: <TableChartIcon sx={{ fontSize: '0.95rem' }} /> },
  { label: 'Priorities', icon: <WarningAmberIcon sx={{ fontSize: '0.95rem' }} /> },
  { label: 'Schedule', icon: <CalendarMonthIcon sx={{ fontSize: '0.95rem' }} /> },
];

const TopNav: React.FC<TopNavProps> = ({ 
  onMenuClick, 
  programCount = 0, 
  objectCount = 0, 
  completionPercentage = 0,
  tabValue = 0,
  onTabChange
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const isProjectsPage = location.pathname === '/projects';

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
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {isProjectsPage ? (
          <>
            {/* Projects Page Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {/* Icon and Title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <StorageIcon sx={{ fontSize: '1.4rem', color: 'primary.light' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                  Migration Plan
                </Typography>
              </Box>

              {/* Stats Divider */}
              <Box sx={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

              {/* Stats */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ whiteSpace: 'nowrap', opacity: 0.75 }}>
                    Programs:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {programCount}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ whiteSpace: 'nowrap', opacity: 0.75 }}>
                    Objects:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {objectCount}
                  </Typography>
                </Box>
                {/* Progress bar + percentage */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={completionPercentage}
                    sx={{
                      width: 80,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      '& .MuiLinearProgress-bar': { borderRadius: 3 },
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.light', whiteSpace: 'nowrap' }}>
                    {completionPercentage}%
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Spacer */}
            <Box sx={{ flex: 1 }} />

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<GroupIcon />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  color: 'white',
                  boxShadow: 'none',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)', boxShadow: 'none' },
                }}
              >
                People
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<DownloadIcon />}
                sx={{ textTransform: 'none', fontWeight: 500 }}
              >
                Export CSV
              </Button>
            </Box>
          </>
        ) : (
          <>
            {/* Default Header */}
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
              RediForge
            </Typography>
          </>
        )}

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

      {/* Sub-nav for Projects page */}
      {isProjectsPage && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 2,
            pb: 1,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {subNavItems.map((item, idx) => (
            <Button
              key={idx}
              size="small"
              startIcon={item.icon}
              onClick={() => idx < 2 && onTabChange?.(idx)}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.8rem',
                borderRadius: '20px',
                px: 1.5,
                py: 0.4,
                color: 'white',
                backgroundColor: tabValue === idx ? 'primary.main' : 'rgba(255, 255, 255, 0.08)',
                opacity: idx > 1 ? 0.5 : 1,
                cursor: idx > 1 ? 'default' : 'pointer',
                '&:hover': {
                  backgroundColor: tabValue === idx
                    ? 'primary.dark'
                    : idx > 1
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(255, 255, 255, 0.15)',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      )}
    </AppBar>
  );
};

export default TopNav;
