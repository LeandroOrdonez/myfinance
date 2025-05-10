import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  userName: string | null;
  login: () => void;
  logout: () => void;
  setUserName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userName, setUserName] = useState<string | null>(null);
  
  // Check if user was previously authenticated and get user name
  useEffect(() => {
    const storedAuth = localStorage.getItem('myfinance_auth');
    const storedName = localStorage.getItem('myfinance_user_name');
    
    if (storedAuth) {
      setIsAuthenticated(JSON.parse(storedAuth));
    }
    
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

  const login = () => {
    setIsAuthenticated(true);
    localStorage.setItem('myfinance_auth', JSON.stringify(true));
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('myfinance_auth');
  };

  const handleSetUserName = (name: string) => {
    setUserName(name);
    localStorage.setItem('myfinance_user_name', name);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userName, 
      login, 
      logout,
      setUserName: handleSetUserName
    }}>
      {children}
    </AuthContext.Provider>
  );
};
