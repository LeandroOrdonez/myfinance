import React from 'react';

interface DashboardCardProps {
  title?: string;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
  className?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ 
  title, 
  children, 
  headerExtra, 
  className = '' 
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 p-6 rounded-3xl border border-slate-200 dark:border-gray-700 shadow-sm transition-all hover:shadow-md ${className}`}>
      {(title || headerExtra) && (
        <div className="flex items-center justify-between mb-6">
          {title && <h4 className="font-bold text-lg text-slate-900 dark:text-white">{title}</h4>}
          {headerExtra}
        </div>
      )}
      {children}
    </div>
  );
};
