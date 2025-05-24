import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, ChevronDown, SunMoon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { darkMode, themePreference, setThemePreference } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center p-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 
                  dark:focus:ring-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700"
        aria-label="Toggle theme"
      >
        <SunMoon className="w-5 h-5 text-blue-600 dark:text-yellow-400" />
        <ChevronDown className="ml-1 w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setThemePreference('system');
              setIsOpen(false);
            }}
            className={`flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${themePreference === 'system' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
          >
            <Monitor className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-300" />
            <span className="text-gray-800 dark:text-gray-200">System</span>
          </button>
          <button
            onClick={() => {
              setThemePreference('light');
              setIsOpen(false);
            }}
            className={`flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${themePreference === 'light' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
          >
            <Sun className="w-4 h-4 mr-2 text-yellow-500" />
            <span className="text-gray-800 dark:text-gray-200">Light</span>
          </button>
          <button
            onClick={() => {
              setThemePreference('dark');
              setIsOpen(false);
            }}
            className={`flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${themePreference === 'dark' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
          >
            <Moon className="w-4 h-4 mr-2 text-blue-600" />
            <span className="text-gray-800 dark:text-gray-200">Dark</span>
          </button>
        </div>
      )}
    </div>
  );
};
