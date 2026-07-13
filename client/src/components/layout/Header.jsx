/**
 * Header/Navbar Component
 * Includes menu toggle, search bar (Ctrl+K), notification dropdown, and user controls
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { dashboardAPI } from '../../services/api';
import {
  AppBar, Toolbar, IconButton, Badge, Box, Menu, MenuItem,
  Typography, Avatar, Divider, ListItemText, ListItemIcon, Tooltip, useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircle from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import WarningIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import { useKeyboardShortcut } from '../../hooks/useDebounce';

const Header = () => {
  const { user, logout } = useAuth();
  const { sidebarOpen, setSidebarOpen, setSearchOpen } = useApp();
  const navigate = useNavigate();
  const theme = useTheme();

  const [anchorEl, setAnchorEl] = useState(null);
  const [notiAnchorEl, setNotiAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Fetch low stock notifications for the dashboard dropdown
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await dashboardAPI.get();
        const alerts = [];

        // Low stock alerts
        if (data.lowStockSarees && data.lowStockSarees.length > 0) {
          data.lowStockSarees.forEach(s => {
            alerts.push({
              id: s.id,
              type: s.current_stock === 0 ? 'out' : 'low',
              title: s.current_stock === 0 ? 'Out of Stock' : 'Low Stock Alert',
              message: `${s.sari_name} (${s.series_code}) has ${s.current_stock} pcs left.`,
              time: 'Just now'
            });
          });
        }
        setNotifications(alerts);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // 30s refresh
      return () => clearInterval(interval);
    }
  }, [user]);

  // Global search shortcut Ctrl + K
  useKeyboardShortcut('k', true, () => {
    setSearchOpen(true);
  });

  const handleProfileMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleProfileMenuClose = () => setAnchorEl(null);

  const handleNotiMenuOpen = (event) => setNotiAnchorEl(event.currentTarget);
  const handleNotiMenuClose = () => setNotiAnchorEl(null);

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
    navigate('/login');
  };

  const handleNotificationClick = (sareeId) => {
    handleNotiMenuClose();
    navigate(`/sarees/${sareeId}`);
  };

  const isLight = theme.palette.mode === 'light';

  return (
    <AppBar position="sticky" sx={{
      color: 'text.primary',
      zIndex: theme.zIndex.drawer + 1
    }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>

          {/* Search Trigger Bar — real <button> so clicking anywhere reliably opens the dialog */}
          <Box
            component="button"
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Open global search"
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: isLight ? '#F1F3F4' : 'rgba(255, 255, 255, 0.05)',
              borderRadius: 6,
              px: 2.5,
              py: 0.75,
              width: { xs: 150, sm: 280, md: 350 },
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              font: 'inherit',
              color: 'inherit',
              textAlign: 'left',
              appearance: 'none',
              '&:hover': {
                bgcolor: isLight ? '#E8EAED' : 'rgba(255, 255, 255, 0.08)',
                transform: 'translateY(-0.5px)'
              },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2
              }
            }}
          >
            <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
            <Typography
              component="span"
              sx={{
                fontSize: '0.82rem',
                flex: 1,
                color: 'text.secondary',
                pointerEvents: 'none',
                userSelect: 'none'
              }}
            >
              Search anything (Ctrl+K)...
            </Typography>
            <Typography component="span" variant="caption" sx={{
              display: { xs: 'none', sm: 'inline-block' },
              bgcolor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
              px: 0.8,
              py: 0.2,
              borderRadius: 1.5,
              fontWeight: 700,
              fontSize: '0.65rem'
            }}>
              Ctrl + K
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notifications Dropdown */}
          <IconButton onClick={handleNotiMenuOpen} color="inherit">
            <Badge badgeContent={notifications.length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* User Account Menu */}
          <Tooltip title={user?.full_name || 'Account'}>
            <IconButton onClick={handleProfileMenuOpen} color="inherit">
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.8rem' }}>
                {user?.full_name?.charAt(0) || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notiAnchorEl}
        open={Boolean(notiAnchorEl)}
        onClose={handleNotiMenuClose}
        slotProps={{
          paper: { sx: { width: 320, maxHeight: 400, mt: 1, borderRadius: 3, boxShadow: 3 } }
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Notifications</Typography>
          {notifications.length > 0 && (
            <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
              {notifications.length} Alerts
            </Typography>
          )}
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <MenuItem disabled sx={{ py: 3, justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">All systems healthy. No alerts.</Typography>
          </MenuItem>
        ) : (
          notifications.map((noti) => (
            <MenuItem
              key={noti.id}
              onClick={() => handleNotificationClick(noti.id)}
              sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}
            >
              <ListItemIcon>
                {noti.type === 'out' ? (
                  <ErrorIcon color="error" />
                ) : (
                  <WarningIcon color="warning" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={noti.title}
                secondary={noti.message}
                slotProps={{
                  primary: { fontSize: '0.82rem', fontWeight: 700, color: noti.type === 'out' ? 'error.main' : 'warning.main' },
                  secondary: { fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'normal' }
                }}
              />
            </MenuItem>
          ))
        )}
      </Menu>

      {/* User Account Menu Dropdown */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        slotProps={{
          paper: { sx: { width: 220, mt: 1, borderRadius: 3, boxShadow: 3 } }
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{user?.full_name}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {user?.email || `@${user?.username}`}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/settings'); }}>
          <ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon>
          <Typography variant="body2">My Settings</Typography>
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Logout</Typography>
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default Header;
