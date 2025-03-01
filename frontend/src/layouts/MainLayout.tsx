import React from 'react';
import { FileUpload } from '../components/FileUpload';
import { UndoButton } from '../components/UndoButton';
import { Sidebar } from '../components/common/Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  onUploadSuccess?: () => void;
  onUndo?: () => Promise<boolean>;
  canUndo?: boolean;
  activeView: string;
  onNavigate: (view: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  onUploadSuccess = () => {},
  onUndo,
  canUndo = false,
  activeView,
  onNavigate
}) => {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar activeView={activeView} onNavigate={onNavigate} />
      
      {/* Main Content */}
      <div className="flex-1 ml-64"> {/* Add margin left to account for sidebar width */}
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {activeView === 'analytics' ? 'Analytics Dashboard' : 'Transactions'}
              </h1>
              <div className="flex space-x-3">
                {onUndo && (
                  <UndoButton onUndo={onUndo} canUndo={canUndo} />
                )}
                <FileUpload onUploadSuccess={onUploadSuccess} />
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}; 