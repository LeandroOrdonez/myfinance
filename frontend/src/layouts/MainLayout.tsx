import React from 'react';
import { FileUpload } from '../components/FileUpload';
import { UndoButton } from '../components/UndoButton';

interface MainLayoutProps {
  children: React.ReactNode;
  onUploadSuccess?: () => void;  // Make it optional
  onUndo?: () => Promise<boolean>;
  canUndo?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  onUploadSuccess = () => {},
  onUndo,
  canUndo = false
}) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              MyFinance Dashboard
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
  );
}; 