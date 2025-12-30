import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  subtitleColor: string;
  trendIcon?: React.ReactNode;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  iconBg, 
  subtitleColor, 
  trendIcon 
}) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-slate-200 dark:border-gray-700 shadow-sm flex items-start justify-between transition-all hover:shadow-md">
    <div>
      <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">{title}</p>
      <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{value}</h3>
      <p className={`text-xs font-medium mt-2 flex items-center gap-1 ${subtitleColor}`}>
        {trendIcon} {subtitle}
      </p>
    </div>
    <div className={`${iconBg} p-3 rounded-2xl`}>{icon}</div>
  </div>
);
