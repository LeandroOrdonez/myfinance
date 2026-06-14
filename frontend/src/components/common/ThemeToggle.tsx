import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, SunMoon, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import clsx from 'clsx';

export const ThemeToggle: React.FC = () => {
  const { themePreference, setThemePreference } = useTheme();
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

  const themes = [
    { id: 'system', label: 'System', icon: Monitor, description: 'Follow system preference' },
    { id: 'light', label: 'Light', icon: Sun, description: 'Always light mode' },
    { id: 'dark', label: 'Dark', icon: Moon, description: 'Always dark mode' },
  ];

  const currentTheme = themes.find(t => t.id === themePreference);
  const CurrentIcon = currentTheme?.icon || SunMoon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200',
          'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
          'hover:bg-[var(--color-bg-tertiary)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          isOpen && 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
        )}
        aria-label="Toggle theme"
      >
        <CurrentIcon className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className={clsx(
          'absolute right-0 mt-2 w-56 rounded-2xl shadow-lg py-2 z-50',
          'bg-[var(--color-surface)] border border-[var(--color-border)]',
          'animate-fade-in'
        )}>
          <div className="px-3 py-2 border-b border-[var(--color-border)] mb-1">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Appearance
            </p>
          </div>

          {themes.map(theme => {
            const Icon = theme.icon;
            const isActive = themePreference === theme.id;

            return (
              <button
                key={theme.id}
                onClick={() => {
                  setThemePreference(theme.id as 'system' | 'light' | 'dark');
                  setIsOpen(false);
                }}
                className={clsx(
                  'flex items-center w-full px-3 py-2.5 mx-2 rounded-xl text-left transition-all duration-200',
                  'hover:bg-[var(--color-bg-tertiary)]',
                  isActive && 'bg-[var(--color-bg-tertiary)]'
                )}
                style={{ width: 'calc(100% - 16px)' }}
              >
                <div className={clsx(
                  'flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-colors',
                  isActive ? 'bg-accent/10 text-accent' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className={clsx(
                    'text-sm font-medium',
                    isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
                  )}>
                    {theme.label}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {theme.description}
                  </p>
                </div>
                {isActive && (
                  <Check className="w-4 h-4 text-accent ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
