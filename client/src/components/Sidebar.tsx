import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Box,
  Divider,
  Typography,
  Chip,
  useTheme,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { palette } from '../theme/palette';

const DRAWER_WIDTH = 260;

interface MenuItemType {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const Sidebar: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();
  const theme = useTheme();

  const mainMenuItems: MenuItemType[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <DashboardIcon sx={{ fontSize: '1.25rem' }} />,
    },
    {
      label: 'Projects',
      path: '/projects',
      icon: <FolderOpenIcon sx={{ fontSize: '1.25rem' }} />,
    },
  ];

  const adminMenuItems: MenuItemType[] = [
    {
      label: 'User Management',
      path: '/admin/users',
      icon: <AdminPanelSettingsIcon sx={{ fontSize: '1.25rem' }} />,
    },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  const renderMenuItems = (items: MenuItemType[]) =>
    items.map((item) => (
      <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
        <ListItemButton
          component={RouterLink}
          to={item.path}
          onClick={onClose}
          selected={isActive(item.path)}
          sx={{
            borderRadius: theme.spacing(1),
            px: 2,
            py: 1.25,
            color: isActive(item.path) ? palette.primary.main : palette.text.secondary,
            backgroundColor: isActive(item.path) ? `${palette.primary.main}12` : 'transparent',
            borderLeft: isActive(item.path) ? `3px solid ${palette.primary.main}` : '3px solid transparent',
            '&:hover': {
              backgroundColor: `${palette.primary.main}16`,
              color: palette.text.primary,
            },
            '& .MuiListItemIcon-root': {
              color: 'inherit',
              minWidth: 40,
            },
          }}
        >
          <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>{item.icon}</Box>
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{
              sx: {
                fontWeight: isActive(item.path) ? 600 : 500,
                fontSize: '0.95rem',
              },
            }}
          />
        </ListItemButton>
      </ListItem>
    ));

  return (
    <Drawer
      anchor="left"
      variant="permanent"
      open={true}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: palette.background.paper,
          borderRight: `1px solid ${palette.divider}`,
          backgroundImage: 'none',
          position: 'fixed',
          height: 'calc(100vh - 64px)',
          top: 64,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          bgcolor: palette.background.paper,
        }}
      >
        {/* Logo Section */}
        <Box
          sx={{
            p: 3,
            borderBottom: `1px solid ${palette.divider}`,
            backgroundColor: palette.background.elevated,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: palette.primary.main,
              letterSpacing: '-0.02em',
              mb: 0.5,
            }}
          >
            RediForge
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: palette.text.secondary,
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Execution Planning
          </Typography>
        </Box>

        {/* User Role Badge */}
        <Box sx={{ p: 2, pb: 1 }}>
          <Chip
            label={user?.role?.toUpperCase() || 'USER'}
            size="small"
            variant="outlined"
            sx={{
              width: '100%',
              height: 28,
              borderColor: `${palette.primary.main}40`,
              color: palette.primary.main,
              fontWeight: 600,
              backgroundColor: `${palette.primary.main}08`,
              fontSize: '0.75rem',
            }}
          />
        </Box>

        {/* Main Navigation */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <List
            subheader={
              <ListSubheader
                component="div"
                sx={{
                  backgroundColor: 'transparent',
                  color: palette.text.secondary,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  px: 2,
                  py: 1,
                  lineHeight: 1.5,
                }}
              >
                Navigation
              </ListSubheader>
            }
            sx={{
              width: '100%',
              backgroundColor: 'transparent',
            }}
          >
            {renderMenuItems(mainMenuItems)}
          </List>

          {/* Admin Section */}
          {user?.role === 'admin' && (
            <>
              <Divider sx={{ my: 2, borderColor: palette.divider }} />
              <List
                subheader={
                  <ListSubheader
                    component="div"
                    sx={{
                      backgroundColor: 'transparent',
                      color: palette.text.secondary,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      px: 2,
                      py: 1,
                      lineHeight: 1.5,
                    }}
                  >
                    Admin
                  </ListSubheader>
                }
                sx={{
                  width: '100%',
                  backgroundColor: 'transparent',
                }}
              >
                {renderMenuItems(adminMenuItems)}
              </List>
            </>
          )}
        </Box>

        {/* Footer Info */}
        <Box
          sx={{
            p: 2,
            borderTop: `1px solid ${palette.divider}`,
            backgroundColor: palette.background.elevated,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: palette.text.disabled,
              display: 'block',
              textAlign: 'center',
            }}
          >
            {user?.email}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: palette.text.disabled,
              display: 'block',
              textAlign: 'center',
              mt: 0.5,
            }}
          >
            v1.0.0
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
