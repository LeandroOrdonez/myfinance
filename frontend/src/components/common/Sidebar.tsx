import React from 'react';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { ChartBarIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate }) => {
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
    <div className="h-screen w-64 bg-white shadow-md fixed left-0 top-0 z-10">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">MyFinance</h1>
      </div>
      
      <NavigationMenu.Root orientation="vertical" className="mt-6">
        <NavigationMenu.List className="flex flex-col space-y-1 px-2">
          {menuItems.map((item) => (
            <NavigationMenu.Item key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={clsx(
                  'flex items-center w-full px-3 py-3 rounded-md text-left',
                  'transition-colors duration-150 ease-in-out',
                  'focus:outline-none',
                  activeView === item.id 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <span className="mr-3">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            </NavigationMenu.Item>
          ))}
        </NavigationMenu.List>
      </NavigationMenu.Root>
    </div>
  );
};