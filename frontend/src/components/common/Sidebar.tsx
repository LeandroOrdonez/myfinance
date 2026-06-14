import React from 'react';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import {
  Home,
  BarChart3,
  List,
  Menu,
  ChevronRight,
  Heart,
  TrendingUp,
  ShieldAlert,
  Wallet
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

// Helper function to generate initials from user name
const getInitials = (name: string | null): string => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  collapsed,
  onToggleCollapse
}) => {
  const { userName } = useAuth();
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      color: 'text-accent'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      color: 'text-info'
    },
    {
      id: 'financial-health',
      label: 'Financial Health',
      icon: Heart,
      color: 'text-success'
    },
    {
      id: 'projections',
      label: 'Projections',
      icon: TrendingUp,
      color: 'text-warning'
    },
    {
      id: 'anomalies',
      label: 'Anomalies',
      icon: ShieldAlert,
      color: 'text-danger'
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: List,
      color: 'text-accent'
    }
  ];

  return (
    <div
      className={clsx(
        'h-screen fixed left-0 top-0 z-30 transition-all duration-300 ease-out',
        'bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)]',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo Section */}
      <div className={clsx(
        'flex items-center border-b border-[var(--color-border)]',
        collapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-[var(--color-text-primary)]">MyFinance</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
        )}

        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-all duration-200"
            aria-label="Collapse sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Collapse Button (when collapsed) */}
      {collapsed && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-16 z-40 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center shadow-lg hover:bg-accent-dark transition-colors duration-200"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Navigation Menu */}
      <NavigationMenu.Root orientation="vertical" className="mt-4 px-2">
        <NavigationMenu.List className="flex flex-col space-y-1">
          {menuItems.map((item) => {
            const isActive = activeView === item.id;
            const Icon = item.icon;

            return (
              <NavigationMenu.Item key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl',
                    'transition-all duration-200 ease-out',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    'cursor-pointer w-full',
                    isActive
                      ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] shadow-inner-light'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]/50 hover:text-[var(--color-text-primary)]'
                  )}
                  title={item.label}
                >
                  <div className={clsx(
                    'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
                    isActive
                      ? `bg-white/10 dark:bg-white/10 shadow-sm`
                      : 'bg-transparent'
                  )}>
                    <Icon className={clsx(
                      'w-5 h-5 transition-all duration-200',
                      isActive
                        ? isActive && item.id === 'dashboard' ? 'text-accent' :
                          isActive && item.id === 'analytics' ? 'text-info' :
                          isActive && item.id === 'financial-health' ? 'text-success' :
                          isActive && item.id === 'projections' ? 'text-warning' :
                          isActive && item.id === 'anomalies' ? 'text-danger' : 'text-accent'
                        : 'text-[var(--color-text-muted)]'
                    )} />
                  </div>
                  {!collapsed && (
                    <span className={clsx(
                      'font-medium text-sm transition-all duration-200',
                      isActive ? 'text-[var(--color-text-primary)]' : ''
                    )}>
                      {item.label}
                    </span>
                  )}
                  {isActive && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
                  )}
                </button>
              </NavigationMenu.Item>
            );
          })}
        </NavigationMenu.List>
      </NavigationMenu.Root>

      {/* Bottom Section */}
      {!collapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--color-bg-tertiary)]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-success to-success-dark flex items-center justify-center">
              <span className="text-white text-xs font-bold">{getInitials(userName)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {userName || 'User'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">Pro Plan</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};