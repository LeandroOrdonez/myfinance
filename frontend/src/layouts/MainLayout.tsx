import React from 'react';
import { FileUpload } from '../components/FileUpload';

interface MainLayoutProps {
  children: React.ReactNode;
}

interface MainLayoutProps {
  children: React.ReactNode;
  onUploadSuccess?: () => void;  // Make it optional
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  onUploadSuccess = () => {} 
}) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              MyFinance Dashboard
            </h1>
            <FileUpload onUploadSuccess={onUploadSuccess} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}; 