import React, { useState } from 'react';
import { PinUnlock } from './PinUnlock';
import SplashScreen from './SplashScreen';
import { useAuth } from '../../contexts/AuthContext';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { isAuthenticated, login, userName, setUserName } = useAuth();
  const [showSplash, setShowSplash] = useState<boolean>(userName === null);

  const handleSplashComplete = (name: string) => {
    setUserName(name);
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (!isAuthenticated) {
    return <PinUnlock onUnlock={login} />;
  }

  return <>{children}</>;
};
