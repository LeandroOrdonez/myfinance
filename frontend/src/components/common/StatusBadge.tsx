import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const colors: Record<string, string> = {
    excellent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    good: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    average: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    poor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    critical: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${colors[status.toLowerCase()] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
      {status}
    </span>
  );
};
