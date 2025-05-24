import React, { createContext, useState, useEffect, useContext } from 'react';

type ThemeMode = 'dark' | 'light' | 'system';

type ThemeContextType = {
  darkMode: boolean;
  themePreference: ThemeMode;
  toggleDarkMode: () => void;
  setThemePreference: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Track user's explicit preference (dark, light, or system)
  const [themePreference, setThemePreference] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('themePreference');
    return (savedTheme as ThemeMode) || 'system';
  });
  
  // Track the actual dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    // If there's an explicit preference, use it
    if (themePreference === 'dark') return true;
    if (themePreference === 'light') return false;
    
    // Otherwise use system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Update dark mode when theme preference changes
  useEffect(() => {
    if (themePreference === 'dark') {
      setDarkMode(true);
    } else if (themePreference === 'light') {
      setDarkMode(false);
    } else {
      // Use system preference
      setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    
    // Save preference to localStorage
    localStorage.setItem('themePreference', themePreference);
  }, [themePreference]);
  
  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if using system preference
      if (themePreference === 'system') {
        setDarkMode(e.matches);
      }
    };
    
    // Add event listener with newer API if available
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }
    
    // Clean up
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [themePreference]);

  // Apply theme to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Toggle between light and dark mode
  const toggleDarkMode = () => {
    // If currently using system preference, switch to explicit preference
    if (themePreference === 'system') {
      setThemePreference(darkMode ? 'light' : 'dark');
    } else {
      // Otherwise just toggle between light and dark
      setThemePreference(themePreference === 'dark' ? 'light' : 'dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      darkMode, 
      themePreference, 
      toggleDarkMode, 
      setThemePreference 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
