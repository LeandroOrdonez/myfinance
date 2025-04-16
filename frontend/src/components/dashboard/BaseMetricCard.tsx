import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

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
        return value >= 0 ? 'text-emerald-600' : 'text-rose-600';
      case 'expense':
        return value >= 0 ? 'text-rose-600' : 'text-emerald-600';
      default:
        return value >= 0 ? 'text-emerald-600' : 'text-rose-600';
    }
  };

  const getBorderColor = (type: typeof colorType) => {
    switch (type) {
      case 'income':
        return 'border-b-emerald-500';
      case 'expense':
        return 'border-b-rose-500';
      default:
        return 'border-b-blue-500';
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
    <div className={`bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 border-b-4 ${getBorderColor(colorType)}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <span className="text-gray-700 font-medium">{title}</span>
        </div>
        <div className={`p-2 rounded-full ${colorType === 'income' ? 'bg-emerald-100' : colorType === 'expense' ? 'bg-rose-100' : 'bg-blue-100'}`}>
          <Icon className={`w-5 h-5 ${colorType === 'income' ? 'text-emerald-500' : colorType === 'expense' ? 'text-rose-500' : 'text-blue-500'}`} />
        </div>
      </div>
      
      <div className="space-y-3">
        <p className={`text-2xl font-bold tracking-tight ${getColorClass(colorType, amount)}`}>
          {formatValue(amount)}
        </p>
        
        <div className="flex items-center">
          {isPositiveChange ? 
            <TrendingUp className={`w-4 h-4 mr-1 ${getColorClass(colorType, changeValue)}`} /> : 
            <TrendingDown className={`w-4 h-4 mr-1 ${getColorClass(colorType, changeValue)}`} />
          }
          <p className={`text-sm font-medium ${getColorClass(colorType, changeValue)}`}>
            {change} <span className="text-gray-500 font-normal">vs prev. ({formatValue(previousAmount)})</span>
          </p>
        </div>
        
        {period !== undefined && (
          <p className="text-xs text-gray-500 mt-2 italic">
            Up to {period}
          </p>
        )}
      </div>
    </div>
  );
}; 