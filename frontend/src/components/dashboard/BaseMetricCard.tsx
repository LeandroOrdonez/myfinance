import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

interface BaseMetricCardProps {
  title: string;
  Icon: LucideIcon;
  amount: number;
  change: string;
  previousAmount: number;
  isPercentage?: boolean;
  colorType?: 'income' | 'expense' | 'neutral';
  period?: string;
}

export const BaseMetricCard: React.FC<BaseMetricCardProps> = ({
  title,
  Icon,
  amount,
  change,
  previousAmount,
  isPercentage = false,
  colorType = 'neutral',
  period
}) => {
  const getColorClass = (type: typeof colorType, value: number) => {
    switch (type) {
      case 'income':
        return value >= 0 ? 'text-success' : 'text-danger';
      case 'expense':
        return value >= 0 ? 'text-danger' : 'text-success';
      default:
        return value >= 0 ? 'text-success' : 'text-danger';
    }
  };

  const getIconBgClass = (type: typeof colorType) => {
    switch (type) {
      case 'income':
        return 'bg-success/10 text-success';
      case 'expense':
        return 'bg-danger/10 text-danger';
      default:
        return 'bg-info/10 text-info';
    }
  };

  const formatValue = (value: number) => {
    if (isPercentage) {
      return `${value.toFixed(1)}%`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
    }).format(value);
  };

  const changeValue = parseFloat(change);
  const isPositiveChange = changeValue >= 0;

  return (
    <div className={clsx(
      'group p-5 rounded-2xl border transition-all duration-300 ease-out',
      'bg-[var(--color-surface)] border-[var(--color-border)]',
      'hover:shadow-card-hover hover:-translate-y-0.5',
      'relative overflow-hidden'
    )}>
      {/* Subtle accent bar */}
      <div className={clsx(
        'absolute bottom-0 left-0 right-0 h-1 transition-all duration-300',
        colorType === 'income' ? 'bg-success' : colorType === 'expense' ? 'bg-danger' : 'bg-info',
        'group-hover:h-1.5'
      )} />

      <div className="flex justify-between items-start mb-4">
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
          {title}
        </span>
        <div className={clsx(
          'p-2 rounded-xl transition-all duration-300 group-hover:scale-105',
          getIconBgClass(colorType)
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="space-y-2">
        <p className={clsx(
          'text-2xl font-bold tracking-tight',
          getColorClass(colorType, amount)
        )}>
          {formatValue(amount)}
        </p>

        <div className="flex items-center gap-1.5">
          {isPositiveChange ?
            <TrendingUp className={clsx('w-4 h-4', getColorClass(colorType, changeValue))} /> :
            <TrendingDown className={clsx('w-4 h-4', getColorClass(colorType, changeValue))} />
          }
          <p className={clsx(
            'text-sm font-medium',
            getColorClass(colorType, changeValue)
          )}>
            {change}
          </p>
          <span className="text-xs text-[var(--color-text-muted)]">
            vs prev ({formatValue(previousAmount)})
          </span>
        </div>

        {period !== undefined && (
          <p className="text-xs text-[var(--color-text-muted)] italic">
            Through {period}
          </p>
        )}
      </div>
    </div>
  );
}; 