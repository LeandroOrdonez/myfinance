import React, { useState, useMemo } from 'react';
import { Loading } from '../common/Loading';
import { useExpenseTypeTimeseries } from '../../hooks/useExpenseTypeTimeseries';
import { subMonths, startOfYear, format as formatDate } from 'date-fns';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartArea, ChartColumnStacked } from 'lucide-react';

const PERIODS = [
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: 'YTD', value: 'ytd' },
  { label: '1Y', value: '1y' },
  { label: '2Y', value: '2y' },
  { label: 'All', value: 'all' },
];

const EXPENSE_TYPE_COLORS = {
  essential: '#10B981', // Green
  discretionary: '#EF4444', // Red
};

export const ExpenseTypeTimeseriesChart: React.FC = () => {
  const [period, setPeriod] = useState('1y');
  const [chartType, setChartType] = useState<'area' | 'bar'>('bar');

  // Compute start_date and end_date based on selected period
  const now = new Date();
  let start_date: string | undefined = undefined;
  let end_date: string | undefined = undefined;

  if (period === '3m') {
    start_date = formatDate(subMonths(now, 3), 'yyyy-MM-01');
  } else if (period === '6m') {
    start_date = formatDate(subMonths(now, 6), 'yyyy-MM-01');
  } else if (period === 'ytd') {
    start_date = formatDate(startOfYear(now), 'yyyy-MM-01');
  } else if (period === '1y') {
    start_date = formatDate(subMonths(now, 12), 'yyyy-MM-01');
  } else if (period === '2y') {
    start_date = formatDate(subMonths(now, 24), 'yyyy-MM-01');
  }

  end_date = formatDate(now, 'yyyy-MM-dd');

  const { timeseriesData, loading } = useExpenseTypeTimeseries(
    undefined, // No specific expense type filter
    start_date,
    end_date
  );

  // Transform data for chart display
  const chartData = useMemo(() => {
    // Get unique dates
    const uniqueDates = Array.from(new Set(timeseriesData.map(item => item.date))).sort();
    
    // Create a map of date -> { essential: amount1, discretionary: amount2 }
    const dataByDate = uniqueDates.map(date => {
      const dateData = timeseriesData.filter(item => item.date === date);
      const entry: Record<string, any> = { date };
      
      // Initialize with zeros
      entry.essential = 0;
      entry.discretionary = 0;
      entry.essential_count = 0;
      entry.discretionary_count = 0;
      entry.essential_percentage = 0;
      entry.discretionary_percentage = 0;
      
      // Fill in actual values
      dateData.forEach(item => {
        if (item.expense_type === 'essential' || item.expense_type === 'discretionary') {
          // For bar chart we'll use the amount
          entry[item.expense_type] = item.period_amount;
          entry[`${item.expense_type}_count`] = item.period_transaction_count;
          // For area chart we'll use the percentage
          entry[`${item.expense_type}_percentage`] = item.period_percentage;
        }
      });
      
      // Calculate total and percentages
      entry.total = entry.essential + entry.discretionary;
      entry.essential_percentage = entry.total > 0 ? (entry.essential / entry.total) * 100 : 0;
      entry.discretionary_percentage = entry.total > 0 ? (entry.discretionary / entry.total) * 100 : 0;
      
      return entry;
    });
    
    return dataByDate;
  }, [timeseriesData]);

  const formatValue = (value: number, isPercentage: boolean = false) => {
    if (!value && value !== 0) return isPercentage ? '0%' : '€0';
    
    if (isPercentage) {
      return `${value.toFixed(1)}%`;
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact'
    }).format(value);
  };

  const renderChart = () => {
    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => {
                const d = new Date(date);
                return formatDate(d, 'MMM yyyy');
              }}
            />
            <YAxis 
              tickFormatter={(value) => formatValue(value, true)}
              domain={[0, 100]}
              allowDataOverflow={true}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === 'Essential') return [formatValue(value, true), 'Essential'];
                if (name === 'Discretionary') return [formatValue(value, true), 'Discretionary'];
                return [value, name];
              }}
              contentStyle={{ 
                backgroundColor: 'var(--color-tooltip-bg)', 
                borderColor: 'var(--color-tooltip-border)',
                color: 'var(--color-tooltip-text)'
              }}
              labelFormatter={(label) => {
                const d = new Date(label);
                return formatDate(d, 'MMMM yyyy');
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="essential_percentage"
              name="Essential"
              stackId="1"
              stroke={EXPENSE_TYPE_COLORS.essential}
              fill={EXPENSE_TYPE_COLORS.essential}
              fillOpacity={0.6}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="discretionary_percentage"
              name="Discretionary"
              stackId="1"
              stroke={EXPENSE_TYPE_COLORS.discretionary}
              fill={EXPENSE_TYPE_COLORS.discretionary}
              fillOpacity={0.6}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
    
    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => {
                const d = new Date(date);
                return formatDate(d, 'MMM yyyy');
              }}
            />
            <YAxis 
              tickFormatter={(value) => formatValue(value)}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === 'Essential') return [formatValue(value), 'Essential'];
                if (name === 'Discretionary') return [formatValue(value), 'Discretionary'];
                return [value, name];
              }}
              contentStyle={{ 
                backgroundColor: 'var(--color-tooltip-bg)', 
                borderColor: 'var(--color-tooltip-border)',
                color: 'var(--color-tooltip-text)'
              }}
              labelFormatter={(label) => {
                const d = new Date(label);
                return formatDate(d, 'MMMM yyyy');
              }}
            />
            <Legend />
            <Bar
              dataKey="essential"
              name="Essential"
              stackId="a"
              fill={EXPENSE_TYPE_COLORS.essential}
              isAnimationActive={false}
            />
            <Bar
              dataKey="discretionary"
              name="Discretionary"
              stackId="a"
              fill={EXPENSE_TYPE_COLORS.discretionary}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }
   
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">Essential vs Discretionary Spending</h3>
        <div className="flex items-center space-x-1 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
         <button
            className={`px-3 py-1 text-sm ${chartType === 'bar' 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
              : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            onClick={() => setChartType('bar')}
          >
            <ChartColumnStacked size={18} />
          </button>
          <button
            className={`px-3 py-1 text-sm ${chartType === 'area' 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
              : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            onClick={() => setChartType('area')}
          >
            <ChartArea size={18} />
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden ml-auto">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`px-3 py-1 text-sm ${period === p.value 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      
      {loading ? (
        <Loading />
      ) : chartData.length > 0 ? (
        <div style={{ height: '400px' }}>
          {renderChart()}
        </div>
      ) : (
        <div className="h-[400px] flex items-center justify-center text-gray-500 dark:text-gray-400">
          No data available
        </div>
      )}
    </div>
  );
};
