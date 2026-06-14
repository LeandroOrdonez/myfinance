import React from 'react';
import clsx from 'clsx';

interface DashboardCardProps {
  title?: string;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'highlight' | 'subtle';
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  children,
  headerExtra,
  className = '',
  variant = 'default'
}) => {
  const variantStyles = {
    default: 'bg-[var(--color-surface)] border-[var(--color-border)]',
    highlight: 'bg-gradient-to-br from-accent/5 to-transparent border-accent/20',
    subtle: 'bg-[var(--color-bg-secondary)] border-transparent'
  };

  return (
    <div className={clsx(
      'p-6 rounded-2xl border transition-all duration-300',
      'hover:shadow-card-hover hover:-translate-y-0.5',
      variantStyles[variant],
      className
    )}>
      {(title || headerExtra) && (
        <div className="flex items-center justify-between mb-5">
          {title && (
            <h4 className="font-semibold text-lg text-[var(--color-text-primary)]">
              {title}
            </h4>
          )}
          {headerExtra}
        </div>
      )}
      {children}
    </div>
  );
};
