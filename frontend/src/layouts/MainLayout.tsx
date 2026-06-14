import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileUpload } from '../components/FileUpload';
import { UndoButton } from '../components/UndoButton';
import { Sidebar } from '../components/common/Sidebar';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { LogoutButton } from '../components/auth/LogoutButton';
import { useTransactions } from '../hooks/useTransactions';
import { UserGreeting } from '../components/dashboard/UserGreeting';
import { Bell, Search } from 'lucide-react';
import clsx from 'clsx';

interface MainLayoutProps {
  children: React.ReactNode;
  onUploadSuccess?: () => void;
  showUndoButton?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  onUploadSuccess = () => {},
  showUndoButton = false,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Extract the current view from the URL path
  const currentPath = location.pathname;
  const currentView = currentPath === '/' ? 'dashboard' : (currentPath.split('/')[1] || 'dashboard');

  // For the undo functionality on the transactions page
  const { handleUndo, canUndo } = useTransactions();

  // Detect screen size for responsive sidebar and scroll position
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    // Initial check
    handleResize();

    // Listen for window resize and scroll
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleNavigate = (view: string) => {
    navigate(`/${view}`);

    // Automatically collapse sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setSidebarCollapsed(true);
    }
  };

  // Format current date
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex">
      {/* Sidebar */}
      <Sidebar
        activeView={currentView}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main Content */}
      <div
        className={clsx(
          'flex-1 transition-all duration-300 ease-out min-h-screen',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        {/* Sticky Header */}
        <header
          className={clsx(
            'sticky top-0 z-20 transition-all duration-200',
            scrolled
              ? 'bg-[var(--color-bg-primary)]/80 backdrop-blur-lg shadow-sm border-b border-[var(--color-border)]'
              : 'bg-transparent'
          )}
        >
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              {/* Left: Greeting & Date */}
              <div className="flex flex-col">
                <UserGreeting />
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{today}</p>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                {/* Search Button */}
                <button className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-all duration-200">
                  <Search className="w-5 h-5" />
                </button>

                {/* Notifications */}
                <button className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-all duration-200 relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
                </button>

                <div className="w-px h-6 bg-[var(--color-border)] mx-1" />

                <ThemeToggle />

                {showUndoButton && (
                  <UndoButton onUndo={handleUndo} canUndo={canUndo} />
                )}

                <FileUpload onUploadSuccess={onUploadSuccess} />
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="max-w-7xl mx-auto px-6 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}; 