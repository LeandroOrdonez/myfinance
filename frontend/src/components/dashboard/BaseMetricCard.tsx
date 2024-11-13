import { LucideIcon } from 'lucide-react';

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
  period: period
}) => {
  const getColorClass = (type: typeof colorType, value: number) => {
    switch (type) {
      case 'income':
        return 'text-green-600';
      case 'expense':
        return 'text-red-600';
      default:
        return value >= 0 ? 'text-green-600' : 'text-red-600';
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

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <span className="text-gray-500 text-sm">{title}</span>
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <div className="space-y-1">
        <p className={`text-xl font-semibold ${getColorClass(colorType, amount)}`}>
          {formatValue(amount)}
        </p>
        <p className={`text-sm ${getColorClass(colorType, parseFloat(change))}`}>
          {change} vs previous ({formatValue(previousAmount)})
        </p>
        {period !== undefined && (
          <p className="text-xs text-gray-500">
            Up to {period}
          </p>
        )}
      </div>
    </div>
  );
}; 