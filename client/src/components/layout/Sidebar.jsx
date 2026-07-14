/**
 * Sidebar Navigation Component — "RestroBit" style
 * Grouped sections, orange active pill, brand logo, user profile, light/dark aware.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Avatar, Chip, IconButton, useMediaQuery, useTheme,
  Button
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SareeIcon from '@mui/icons-material/Checkroom';
import LowStockIcon from '@mui/icons-material/WarningAmber';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import StorefrontIcon from '@mui/icons-material/Storefront';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

const DRAWER_WIDTH = 264;

// Grouped nav — spec §4 final structure
const navSections = [
  {
    heading: 'Main',
    items: [
      { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
      { label: 'All Sarees', path: '/sarees', icon: <SareeIcon /> },
    ],
  },
  {
    heading: 'Inventory',
    items: [
      { label: 'Low Stock', path: '/low-stock', icon: <LowStockIcon />, badge: true },
      { label: 'Stock Requests', path: '/stock-requests', icon: <WhatsAppIcon /> },
      { label: 'Stock History', path: '/history', icon: <HistoryIcon /> },
    ],
  },
  {
    heading: 'Business',
    items: [
      { label: 'Suppliers', path: '/suppliers', icon: <PeopleIcon /> },
    ],
  },
  {
    heading: 'System',
    items: [
      { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
    ],
  },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { sidebarOpen, setSidebarOpen, themeMode, toggleTheme } = useApp();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isLight = themeMode === 'light';

  const mutedText = isLight ? '#9E8E7A' : '#8A7C6A';
  const idleText = isLight ? '#2E2A24' : '#D8CABA';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isItemActive = (path) => {
    // '/sarees/add' and '/sarees/edit/...' are sub-workflows of All Sarees,
    // so keep '/sarees' highlighted for those routes too.
    if (path === '/sarees') {
      return location.pathname === '/sarees' ||
        location.pathname.startsWith('/sarees/add') ||
        location.pathname.startsWith('/sarees/edit');
    }
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  const drawerContent = (
    <Box sx={{
      display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
      bgcolor: 'transparent',
    }}>
      {/* Brand */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 68 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: '11px',
            background: 'linear-gradient(135deg, #AC9C8D 0%, #72383D 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(114,56,61,0.40)',
          }}>
            <StorefrontIcon sx={{ color: '#fff', fontSize: '1.25rem' }} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.1, color: 'text.primary', letterSpacing: '-0.01em' }}>
              KP<Box component="span" sx={{ color: 'primary.main' }}> Creation</Box>
            </Typography>
            <Typography sx={{ fontSize: '0.62rem', color: mutedText, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Inventory Portal
            </Typography>
          </Box>
        </Box>
        {isMobile && (
          <IconButton onClick={() => setSidebarOpen(false)} sx={{ color: 'text.secondary' }}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>



      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 0.5 }}>
        {navSections.map((section) => {
          const items = section.items;
          if (items.length === 0) return null;
          return (
            <Box key={section.heading} sx={{ mb: 2 }}>
              <Typography sx={{
                px: 1.5, mb: 1, fontSize: '0.62rem', fontWeight: 800,
                letterSpacing: '0.1em', textTransform: 'uppercase', color: mutedText,
              }}>
                {section.heading}
              </Typography>
              <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {items.map((item) => {
                  const active = isItemActive(item.path);
                  return (
                    <ListItemButton
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        if (isMobile) setSidebarOpen(false);
                      }}
                      sx={{
                        position: 'relative',
                        borderRadius: '8px',
                        py: 1, px: 2, minHeight: 40,
                        bgcolor: active ? 'rgba(59, 17, 26, 0.05)' : 'transparent',
                        color: active ? 'primary.main' : idleText,
                        borderLeft: active ? '4px solid #3B111A' : '4px solid transparent',
                        '&:hover': {
                          bgcolor: active ? 'rgba(59, 17, 26, 0.08)' : (isLight ? '#F1F3F4' : 'rgba(255,255,255,0.04)'),
                        },
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <ListItemIcon sx={{
                        minWidth: 32, color: active ? 'primary.main' : mutedText,
                        '& .MuiSvgIcon-root': { fontSize: '1.25rem' },
                      }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        slotProps={{ primary: { fontSize: '0.85rem', fontWeight: active ? 800 : 600 } }}
                      />
                      {item.badge && (
                        <Chip label="!" size="small" color="error"
                          sx={{ height: 18, fontSize: '0.6rem', minWidth: 18, px: 0, fontWeight: 800, borderRadius: 1 }} />
                      )}
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>

      {/* Contextual Action Button */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Button
          variant="contained"
          fullWidth
          onClick={() => {
            if (location.pathname === '/stock-requests') {
              // Click action or trigger dialog
              const btn = document.getElementById('new-stock-request-btn');
              if (btn) btn.click();
            } else {
              navigate('/sarees/add');
            }
          }}
          sx={{
            bgcolor: 'primary.main',
            color: '#FFFFFF',
            borderRadius: '6px',
            py: 1.25,
            fontSize: '0.8rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            '&:hover': { bgcolor: '#2A0B12' }
          }}
        >
          {location.pathname === '/stock-requests' ? 'New Stock Request' : 'New Collection'}
        </Button>
      </Box>

    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      open={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
      sx={{
        width: sidebarOpen ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        transition: 'width 0.3s ease',
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
export { DRAWER_WIDTH };
