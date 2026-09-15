/**
 * Sidebar Navigation Component — Redesigned with shadcn/ui & Tailwind CSS
 * Editorial Luxury Design with grouped navigation, active indicators, and responsive drawer support.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  Shirt,
  AlertTriangle,
  History,
  Settings,
  Store,
  MessageCircle,
  X,
  PlusCircle,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  Sparkles
} from 'lucide-react';

const DRAWER_WIDTH = 264;

const navSections = [
  {
    heading: 'Main',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'All Sarees', path: '/sarees', icon: Shirt },
    ],
  },
  {
    heading: 'Inventory',
    items: [
      { label: 'Low Stock', path: '/low-stock', icon: AlertTriangle, badge: '!' },
      { label: 'Stock Requests', path: '/stock-requests', icon: MessageCircle },
      { label: 'Stock History', path: '/history', icon: History },
    ],
  },
  {
    heading: 'System',
    items: [
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { sidebarOpen, setSidebarOpen, themeMode, toggleTheme } = useApp();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isItemActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    if (path === '/sarees') {
      return (
        location.pathname === '/sarees' ||
        location.pathname.startsWith('/sarees/add') ||
        location.pathname.startsWith('/sarees/edit')
      );
    }
    return location.pathname === path || (path !== '/' && path !== '/dashboard' && location.pathname.startsWith(path));
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 flex flex-col h-full bg-card border-r border-border transition-all duration-300 ease-in-out shrink-0",
          sidebarOpen ? "w-[264px] translate-x-0" : "-translate-x-full md:w-0 md:translate-x-0 md:overflow-hidden md:border-r-0"
        )}
        style={{ width: sidebarOpen ? `${DRAWER_WIDTH}px` : undefined }}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 min-h-[64px]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-burgundy-900 to-burgundy-700 text-white shadow-luxury">
              <Store className="w-5 h-5 text-amber-200" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg font-bold tracking-tight text-foreground leading-tight">
                KP <span className="text-burgundy-900 dark:text-burgundy-400">Creation</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                Inventory Suite
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-6">
            {navSections.map((section) => (
              <div key={section.heading} className="space-y-1">
                <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {section.heading}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = isItemActive(item.path);
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          if (window.innerWidth < 768) setSidebarOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group text-left",
                          active
                            ? "bg-burgundy-900 text-white shadow-luxury font-semibold dark:bg-burgundy-900 dark:text-white"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent
                            className={cn(
                              "w-4 h-4 transition-colors",
                              active ? "text-amber-200" : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                          <span>{item.label}</span>
                        </div>

                        {item.badge && (
                          <Badge
                            variant={active ? "secondary" : "destructive"}
                            className="h-5 px-1.5 text-[10px] font-bold"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Action Button */}
        <div className="p-3 border-t border-border/50">
          <Button
            variant="luxury"
            className="w-full flex items-center justify-center gap-2 h-10 text-xs uppercase tracking-wider font-bold shadow-luxury"
            onClick={() => {
              if (location.pathname === '/stock-requests') {
                const btn = document.getElementById('new-stock-request-btn');
                if (btn) btn.click();
              } else {
                navigate('/sarees/add');
                if (window.innerWidth < 768) setSidebarOpen(false);
              }
            }}
          >
            <PlusCircle className="w-4 h-4" />
            {location.pathname === '/stock-requests' ? 'New Request' : 'New Collection'}
          </Button>
        </div>

        {/* User Card & Footer Controls */}
        <div className="p-3 border-t border-border bg-muted/20 flex flex-col gap-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-burgundy-900 text-white font-bold text-xs shrink-0">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground truncate leading-tight">
                  {user?.full_name || 'Admin User'}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {user?.role || 'Staff'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={toggleTheme}
                title="Toggle Theme"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {themeMode === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
export { DRAWER_WIDTH };
