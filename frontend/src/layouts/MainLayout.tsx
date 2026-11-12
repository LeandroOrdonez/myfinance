import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileUpload } from '../components/FileUpload';
import { UndoButton } from '../components/UndoButton';
import { Sidebar } from '../components/common/Sidebar';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { PrivacyToggle } from '../components/common/PrivacyToggle';
import { LogoutButton } from '../components/auth/LogoutButton';
import { useTransactions } from '../hooks/useTransactions';
import { UserGreeting } from '../components/dashboard/UserGreeting';
import { Menu } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Extract the current view from the URL path
  const currentPath = location.pathname;
  const currentView = currentPath === '/' ? 'dashboard' : (currentPath.split('/')[1] || 'dashboard');

  // For the undo functionality on the transactions page
  const { handleUndo, canUndo } = useTransactions();

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const handleBreakpoint = () => {
      if (desktop.matches) setMobileNavOpen(false);
    };
    const handleScroll = () => setScrolled(window.scrollY > 10);

    handleScroll();
    desktop.addEventListener('change', handleBreakpoint);
    window.addEventListener('scroll', handleScroll);
    return () => {
      desktop.removeEventListener('change', handleBreakpoint);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleNavigate = (view: string) => {
    navigate(`/${view}`);

    setMobileNavOpen(false);
  };

  // Format current date
  const today = new Date().toLocaleDateString('en-IE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex">
      {/* Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          activeView={currentView}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </div>

      {/* Main Content */}
      <div
        className={clsx(
          'flex-1 min-w-0 transition-all duration-300 ease-out motion-reduce:transition-none min-h-screen',
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
              {/* Left: Navigation, greeting & date */}
              <div className="flex items-center gap-3 min-w-0">
                <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <Dialog.Trigger asChild>
                    <button
                      type="button"
                      aria-label="Open navigation"
                      aria-expanded={mobileNavOpen}
                      aria-controls="mobile-navigation"
                      className="lg:hidden shrink-0 p-2 rounded-lg text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Menu className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
                    <Dialog.Content
                      id="mobile-navigation"
                      aria-describedby={undefined}
                      className="fixed inset-y-0 left-0 z-50 w-72 max-w-[calc(100vw-3rem)] bg-[var(--color-bg-secondary)] shadow-xl focus:outline-none"
                    >
                      <Dialog.Title className="sr-only">Navigation</Dialog.Title>
                      <Sidebar
                        activeView={currentView}
                        onNavigate={handleNavigate}
                        collapsed={false}
                        onToggleCollapse={() => setMobileNavOpen(false)}
                        mobile
                      />
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
                <div className="min-w-0">
                  <UserGreeting />
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{today}</p>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <PrivacyToggle />
                <FileUpload onUploadSuccess={onUploadSuccess} />
                <ThemeToggle />

                {showUndoButton && (
                  <UndoButton onUndo={handleUndo} canUndo={canUndo} />
                )}

                <LogoutButton />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}; 