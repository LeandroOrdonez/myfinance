import React, { createContext, useState, useContext } from 'react';
import { PRIVACY_MASK } from '../utils/formatPrivateAmount';

type PrivacyContextType = {
  privacyMode: boolean;
  togglePrivacyMode: () => void;
  /**
   * Mask a non-currency string (e.g. narrative snippets) when privacy mode
   * is on. Currency amounts should keep using formatPrivateAmount.
   */
  maskString: (value: string) => string;
};

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('privacyMode') === 'true';
  });

  const togglePrivacyMode = () => {
    setPrivacyMode(prev => {
      const next = !prev;
      localStorage.setItem('privacyMode', String(next));
      return next;
    });
  };

  const maskString = (value: string): string =>
    privacyMode ? PRIVACY_MASK : value;

  return (
    <PrivacyContext.Provider value={{ privacyMode, togglePrivacyMode, maskString }}>
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacyMode = (): PrivacyContextType => {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error('usePrivacyMode must be used within a PrivacyProvider');
  }
  return context;
};
