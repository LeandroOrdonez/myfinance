import React, { useState, useMemo, useEffect } from 'react';
import { Loading } from '../common/Loading';
import { useCategoryTimeseries } from '../../hooks/useCategoryTimeseries';
import { TransactionType } from '../../types/transaction';
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
  ResponsiveContainer
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

interface CategoryTimeseriesChartProps {
  title?: string;
  defaultTransactionType?: TransactionType;
}

export const CategoryTimeseriesChart: React.FC<CategoryTimeseriesChartProps> = ({ 
  title = "Category Trends Over Time",
  defaultTransactionType = TransactionType.EXPENSE
}) => {
  const [period, setPeriod] = useState('1y');
  const [transactionType, setTransactionType] = useState<TransactionType>(defaultTransactionType);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});

  // Compute start_date and end_date based on selected period
  const now = new Date();
  let start_date: string | undefined = undefined;
  let end_date: string | undefined = undefined;

  if (period === '3m') {
    start_date = formatDate(subMonths(now, 3), 'yyyy-MM-01');
    end_date = formatDate(now, 'yyyy-MM-dd');
  } else if (period === '6m') {
    start_date = formatDate(subMonths(now, 6), 'yyyy-MM-01');
    end_date = formatDate(now, 'yyyy-MM-dd');
  } else if (period === 'ytd') {
    start_date = formatDate(startOfYear(now), 'yyyy-MM-01');
    end_date = formatDate(now, 'yyyy-MM-dd');
  } else if (period === '1y') {
    start_date = formatDate(subMonths(now, 12), 'yyyy-MM-01');
    end_date = formatDate(now, 'yyyy-MM-dd');
  } else if (period === '2y') {
    start_date = formatDate(subMonths(now, 24), 'yyyy-MM-01');
    end_date = formatDate(now, 'yyyy-MM-dd');
  }

  const { timeseriesData, loading } = useCategoryTimeseries(
    transactionType,
    undefined, // No specific category filter
    start_date,
    end_date
  );

  // Get unique categories from the data
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    timeseriesData.forEach(item => uniqueCategories.add(item.category_name));
    return Array.from(uniqueCategories);
  }, [timeseriesData]);

  // Get unique dates from the data
  const dates = useMemo(() => {
    const uniqueDates = new Set<string>();
    timeseriesData.forEach(item => uniqueDates.add(item.date));
    return Array.from(uniqueDates).sort();
  }, [timeseriesData]);

  // Transform data for chart display
  const chartData = useMemo(() => {
    // Create a map of date -> { category1: amount1, category2: amount2, ... }
    const dataByDate = new Map<string, Record<string, any>>();
    
    // Initialize with all dates and categories
    dates.forEach(date => {
      const entry: Record<string, any> = { date };
      categories.forEach(category => {
        // Initialize percentage fields (for area chart)
        entry[category] = 0;
        // Initialize amount fields (for bar chart)
        entry[`${category}_amount`] = 0;
      });
      dataByDate.set(date, entry);
    });
    
    // Fill in actual values
    timeseriesData.forEach(item => {
      const dateEntry = dataByDate.get(item.date);
      if (dateEntry) {
        // Use period_percentage for area chart
        dateEntry[item.category_name] = item.period_percentage;
        // Use period_amount for bar chart
        dateEntry[`${item.category_name}_amount`] = item.period_amount;
      }
    });
    
    return Array.from(dataByDate.values());
  }, [timeseriesData, dates, categories]);

  // Define color palette for categories
  const categoryColors = useMemo(() => {
    const colors = [
      // Primary colors
      '#10B981', // Green
      '#EF4444', // Red
      '#6366F1', // Indigo
      '#F59E0B', // Amber
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#14B8A6', // Teal
      '#F97316', // Orange
      '#3B82F6', // Blue
      '#84CC16', // Lime
      
      // Secondary colors
      '#0891B2', // Cyan
      '#A855F7', // Violet
      '#D946EF', // Fuchsia
      '#F43F5E', // Rose
      '#059669', // Emerald
      '#65A30D', // Lime Dark
      '#0284C7', // Sky
      '#7C3AED', // Violet Dark
      '#2563EB', // Blue Dark
      '#DC2626', // Red Dark
      
      // Tertiary colors
      '#0D9488', // Teal Dark
      '#0369A1', // Sky Dark
      '#4F46E5', // Indigo Dark
      '#9333EA', // Purple Dark
      '#C026D3', // Fuchsia Dark
      '#E11D48', // Rose Dark
      '#16A34A', // Green Dark
      '#CA8A04', // Yellow Dark
      '#EA580C', // Orange Dark
      '#4338CA', // Indigo Medium
    ];
    
    const colorMap: Record<string, string> = {};
    categories.forEach((category, index) => {
      colorMap[category] = colors[index % colors.length];
    });
    
    return colorMap;
  }, [categories]);

  // Initialize visible series when categories change
  useEffect(() => {
    const initialVisibility = categories.reduce((acc, category) => ({
      ...acc,
      [category]: true
    }), {});
    setVisibleSeries(initialVisibility);
  }, [categories]);

  const handleLegendClick = (entry: any) => {
    // Toggle visibility of the clicked series
    
    setVisibleSeries(prev => ({
      ...prev,
      [entry.dataKey]: !prev[entry.dataKey]
    }));
    
    // Return false to prevent Recharts' default toggle behavior
    return false;
  };

  const formatValue = (value: number, isPercentage: boolean = true) => {
    if (!value && value !== 0) return isPercentage ? '0%' : '€0';
    
    if (isPercentage) {
      // Format as percentage for area chart
      return `${value.toFixed(1)}%`;
    } else {
      // Format as currency for bar chart
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        notation: 'compact'
      }).format(value);
    }
  };

  const renderChart = () => {
    if (chartType === 'area') {
      return (
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
            formatter={(value: number, name: string) => [formatValue(value, true), name]}
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
          <Legend onClick={handleLegendClick} 
            wrapperStyle={{ cursor: 'pointer' }}
            formatter={(value, entry: any) => (
                <span style={{ 
                    color: visibleSeries[entry.dataKey] ? entry.color : '#999',
                    cursor: 'pointer'
                }}>
                    {value}
                </span>
            )}
          />
          
          {categories.map(category => (
            <Area
              key={category}
              type="monotone"
              dataKey={category}
              name={category}
              stackId="1"
              stroke={categoryColors[category]}
              fill={categoryColors[category]}
              fillOpacity={0.6}
              isAnimationActive={false}
              hide={!visibleSeries[category]}
            />
          ))}
        </AreaChart>
      );
    }
    
    // Default to bar chart
    return (
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
          tickFormatter={(value) => formatValue(value, false)}
          domain={[0, 'auto']}
        />
        <Tooltip 
          formatter={(value: number, name: string) => {
            // Extract the base category name without the _amount suffix
            const categoryName = name.replace('_amount', '');
            return [formatValue(value, false), categoryName];
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
        <Legend 
          onClick={(entry) => {
            // Extract the base category name without the _amount suffix
            const dataKey = String(entry.dataKey);
            const categoryName = dataKey.replace('_amount', '');
            handleLegendClick({ ...entry, dataKey: categoryName });
          }} 
          wrapperStyle={{ cursor: 'pointer' }}
          formatter={(value, entry: any) => {
            // Extract the base category name without the _amount suffix
            const dataKey = String(entry.dataKey);
            const categoryName = dataKey.replace('_amount', '');
            return (
              <span style={{ 
                color: visibleSeries[categoryName] ? entry.color : '#999',
                cursor: 'pointer'
              }}>
                {categoryName}
              </span>
            );
          }}
        />
        
        {categories.map(category => (
          <Bar
            key={category}
            dataKey={`${category}_amount`}
            name={`${category}_amount`}
            stackId="1"
            fill={categoryColors[category]}
            isAnimationActive={false}
            hide={!visibleSeries[category]}
          />
        ))}
      </BarChart>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">{title}</h3>
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
      <div className="flex space-x-2">
          <button
            onClick={() => setTransactionType(TransactionType.EXPENSE)}
            className={`px-3 py-1 text-sm rounded-md ${
              transactionType === TransactionType.EXPENSE
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setTransactionType(TransactionType.INCOME)}
            className={`px-3 py-1 text-sm rounded-md ${
              transactionType === TransactionType.INCOME
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Income
          </button>
        </div>
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
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[400px] flex items-center justify-center text-gray-500 dark:text-gray-400">
          No data available
        </div>
      )}
    </div>
  );
};
