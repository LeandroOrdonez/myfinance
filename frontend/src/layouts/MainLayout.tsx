import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileUpload } from '../components/FileUpload';
import { UndoButton } from '../components/UndoButton';
import { Sidebar } from '../components/common/Sidebar';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { LogoutButton } from '../components/auth/LogoutButton';
import { useTransactions } from '../hooks/useTransactions';
import { UserGreeting } from '../components/dashboard/UserGreeting';

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
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract the current view from the URL path
  const currentPath = location.pathname;
  const currentView = currentPath.split('/')[1] || 'analytics';
  
  // For the undo functionality on the transactions page
  const { handleUndo, canUndo } = useTransactions();
  
  // Detect screen size for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    
    // Initial check
    handleResize();
    
    // Listen for window resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  const handleNavigate = (view: string) => {
    navigate(`/${view}`);
    
    // Automatically collapse sidebar on mobile after navigation
    if (window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <Sidebar 
        activeView={currentView} 
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar} 
      />
      
      {/* Main Content */}
      <div 
        className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}
      >
        <div className="py-6 dark:text-gray-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-center mb-6">
              <UserGreeting />
              <div className="flex space-x-3 items-center">
                <ThemeToggle />
                {showUndoButton && (
                  <UndoButton onUndo={handleUndo} canUndo={canUndo} />
                )}
                <FileUpload onUploadSuccess={onUploadSuccess} />
                <LogoutButton />
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}; 