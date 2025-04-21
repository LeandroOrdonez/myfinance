import React from 'react';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { 
  ChartBarIcon, 
  ListBulletIcon,
  Bars3Icon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  onNavigate,
  collapsed,
  onToggleCollapse
}) => {
  const menuItems = [
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <ChartBarIcon className="h-5 w-5" />
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: <ListBulletIcon className="h-5 w-5" />
    }
  ];

  return (
    <div 
      className={clsx(
        'h-screen bg-white dark:bg-gray-800 shadow-md fixed left-0 top-0 z-10 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className={clsx(
        'border-b border-gray-200 dark:border-gray-700 flex items-center',
        collapsed ? 'justify-center p-3' : 'justify-between p-4'
      )}>
        {!collapsed && (
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">MyFinance</h1>
        )}
        
        <button 
          onClick={onToggleCollapse}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors p-1 rounded-md"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <Bars3Icon className="h-5 w-5" />
          )}
        </button>
      </div>
      
      <NavigationMenu.Root orientation="vertical" className="mt-6">
        <NavigationMenu.List className="flex flex-col space-y-1 px-2">
          {menuItems.map((item) => (
            <NavigationMenu.Item key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={clsx(
                  'flex items-center px-3 py-3 rounded-md',
                  collapsed ? 'justify-center' : 'w-full text-left',
                  'transition-colors duration-150 ease-in-out',
                  'focus:outline-none',
                  activeView === item.id 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
                title={item.label}
              >
                <span className={collapsed ? '' : 'mr-3'}>{item.icon}</span>
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </button>
            </NavigationMenu.Item>
          ))}
        </NavigationMenu.List>
      </NavigationMenu.Root>
    </div>
  );
};