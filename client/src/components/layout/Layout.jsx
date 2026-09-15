/**
 * Layout Component
 * Unifies Sidebar, Header, Global Search, and Content Area
 * Built with shadcn/ui design language and Tailwind CSS
 */
import Sidebar from './Sidebar';
import Header from './Header';
import GlobalSearchDialog from '../common/GlobalSearchDialog';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';

const Layout = ({ children }) => {
  const { sidebarOpen } = useApp();

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden transition-all duration-300">
        {/* Sticky Top Header */}
        <Header />

        {/* Global Search Dialog Modal */}
        <GlobalSearchDialog />

        {/* Scrollable Page Viewport */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/20">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
