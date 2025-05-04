import React from 'react';
import { PinUnlock } from './PinUnlock';
import { useAuth } from '../../contexts/AuthContext';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return <PinUnlock onUnlock={login} />;
  }

  return <>{children}</>;
};
