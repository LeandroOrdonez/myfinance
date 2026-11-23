import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';

interface ProjectionTabsProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  tabs: { value: string; label: string; content: React.ReactNode; keepMounted?: boolean }[];
}

export const ProjectionTabs: React.FC<ProjectionTabsProps> = ({ label, value, onValueChange, tabs }) => (
  <Tabs.Root value={value} onValueChange={onValueChange} className="min-w-0">
    <Tabs.List aria-label={label} className="flex flex-wrap gap-x-2 border-b border-gray-200 dark:border-gray-700">
      {tabs.map(tab => (
        <Tabs.Trigger
          key={tab.value}
          value={tab.value}
          className="min-h-11 px-3 py-2 text-sm font-medium border-b-2 border-transparent text-gray-600 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 data-[state=active]:border-blue-500 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-t"
        >
          {tab.label}
        </Tabs.Trigger>
      ))}
    </Tabs.List>
    {tabs.map(tab => (
      <Tabs.Content key={tab.value} value={tab.value} forceMount={tab.keepMounted ? true : undefined} hidden={value !== tab.value} className="mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
        {tab.content}
      </Tabs.Content>
    ))}
  </Tabs.Root>
);
