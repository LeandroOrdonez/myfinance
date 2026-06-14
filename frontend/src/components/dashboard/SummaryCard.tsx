import React from 'react';
import clsx from 'clsx';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg?: string;
  subtitleColor?: string;
  trendIcon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  subtitleColor,
  trendIcon,
  variant = 'default'
}) => {
  const variantStyles = {
    default: {
      iconBg: 'bg-accent/10 text-accent',
      accent: 'text-accent'
    },
    success: {
      iconBg: 'bg-success/10 text-success',
      accent: 'text-success'
    },
    warning: {
      iconBg: 'bg-warning/10 text-warning',
      accent: 'text-warning'
    },
    danger: {
      iconBg: 'bg-danger/10 text-danger',
      accent: 'text-danger'
    },
    info: {
      iconBg: 'bg-info/10 text-info',
      accent: 'text-info'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className={clsx(
      'group p-5 rounded-2xl border transition-all duration-300 ease-out',
      'bg-[var(--color-surface)] border-[var(--color-border)]',
      'hover:shadow-card-hover hover:border-[var(--color-accent)]/30',
      'hover:-translate-y-0.5'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {title}
          </p>
          <h3 className="text-2xl font-bold mt-2 text-[var(--color-text-primary)] tracking-tight">
            {value}
          </h3>
          <div className={clsx(
            'flex items-center gap-1.5 mt-2 text-xs font-medium',
            subtitleColor || styles.accent
          )}>
            {trendIcon && <span className="opacity-80">{trendIcon}</span>}
            <span className="truncate">{subtitle}</span>
          </div>
        </div>
        <div className={clsx(
          'flex-shrink-0 p-2.5 rounded-xl transition-all duration-300',
          'group-hover:scale-105',
          iconBg || styles.iconBg
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
};
