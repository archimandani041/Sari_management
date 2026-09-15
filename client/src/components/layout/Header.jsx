/**
 * Header/Navbar Component — Redesigned with shadcn/ui & Tailwind CSS
 * Features:
 * - Search bar pill with Ctrl+K shortcut trigger
 * - Notification bell with live badge and styled dropdown
 * - Dark mode toggle
 * - Profile avatar and quick dropdown menu
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { dashboardAPI } from '../../services/api';
import { useKeyboardShortcut } from '../../hooks/useDebounce';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  Settings,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  User as UserIcon,
} from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const { sidebarOpen, setSidebarOpen, setSearchOpen, themeMode, toggleTheme } = useApp();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);

  // Fetch low stock notifications for dropdown
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await dashboardAPI.get();
        const alerts = [];

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
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Global search shortcut Ctrl + K
  useKeyboardShortcut('k', true, () => {
    setSearchOpen(true);
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNotificationClick = (sareeId) => {
    navigate(`/sarees/${sareeId}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/85 px-4 sm:px-6 backdrop-blur-md">
      {/* Left Area: Hamburger & Search Pill */}
      <div className="flex items-center gap-3 md:gap-4 flex-1 max-w-xl">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
          className="text-muted-foreground hover:text-foreground"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Search Bar Pill Trigger */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-3 w-full max-w-md h-10 px-3.5 rounded-full border border-border/80 bg-muted/40 hover:bg-muted/70 hover:border-burgundy-900/30 text-muted-foreground text-sm transition-all duration-200 shadow-xs group"
        >
          <Search className="w-4 h-4 text-muted-foreground group-hover:text-burgundy-900 dark:group-hover:text-burgundy-400 transition-colors" />
          <span className="flex-1 text-left text-xs sm:text-sm font-medium truncate">
            Search sarees, series code, fabrics...
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground bg-background border border-border rounded-md shadow-xs">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right Area: Theme Toggle, Notifications, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="text-muted-foreground hover:text-foreground"
        >
          {themeMode === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>

        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative text-muted-foreground hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80 p-0 shadow-luxury-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-bold text-foreground">Alerts & Notifications</span>
              {notifications.length > 0 ? (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {notifications.length} low stock
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Healthy
                </Badge>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <p className="text-xs font-medium">All stock levels are healthy.</p>
                </div>
              ) : (
                notifications.map((noti) => (
                  <button
                    key={noti.id}
                    onClick={() => handleNotificationClick(noti.id)}
                    className="w-full flex items-start gap-3 p-3 hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive mt-0.5 shrink-0">
                      {noti.type === 'out' ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-foreground leading-tight">
                        {noti.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {noti.message}
                      </span>
                      <span className="text-[10px] text-muted-foreground/80 mt-1">
                        {noti.time}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-2 border-t border-border bg-muted/20">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-burgundy-900 dark:text-burgundy-300 font-bold"
                  onClick={() => navigate('/low-stock')}
                >
                  View All Low Stock Items
                </Button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-[1px] bg-border mx-1" />

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 p-1 rounded-full hover:bg-muted/60 transition-colors text-left focus:outline-hidden">
              <div className="hidden md:flex flex-col items-end leading-tight">
                <span className="text-xs font-bold text-foreground max-w-[120px] truncate">
                  {user?.full_name || 'Admin User'}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {user?.role || 'Staff'}
                </span>
              </div>
              <Avatar className="w-8 h-8 ring-2 ring-burgundy-900/20">
                <AvatarFallback className="bg-burgundy-900 text-white text-xs font-bold">
                  {user?.full_name?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 shadow-luxury-lg">
            <DropdownMenuLabel className="font-normal p-3 pb-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold text-foreground leading-none">
                  {user?.full_name}
                </p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {user?.email || `@${user?.username}`}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate('/settings')}
              className="cursor-pointer gap-2 py-2"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer gap-2 py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
