import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { TransactionType, WeekdayDistribution as WeekdayDistributionType } from '../../types/transaction';
import { subMonths, startOfYear, format as formatDate } from 'date-fns';

// Format currency values
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(value);
};

// Define periods similar to FinancialTrends component
const PERIODS = [
  { label: '3m', value: '3m' },
  { label: '6m', value: '6m' },
  { label: 'YTD', value: 'ytd' },
  { label: '1y', value: '1y' },
  { label: 'All', value: 'all' },
];

const WeekdayDistribution: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WeekdayDistributionType | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType | 'all'>('all');
  const [period, setPeriod] = useState('all');
  const [activeTab, setActiveTab] = useState('average');
  
  // Compute start_date and end_date based on selected period
  const now = new Date();
  let startDate: string | undefined = undefined;
  let endDate: string | undefined = undefined;

  if (period === '3m') {
    startDate = formatDate(subMonths(now, 3), 'yyyy-MM-dd');
    endDate = formatDate(now, 'yyyy-MM-dd');
  } else if (period === '6m') {
    startDate = formatDate(subMonths(now, 6), 'yyyy-MM-dd');
    endDate = formatDate(now, 'yyyy-MM-dd');
  } else if (period === 'ytd') {
    startDate = formatDate(startOfYear(now), 'yyyy-MM-dd');
    endDate = formatDate(now, 'yyyy-MM-dd');
  } else if (period === '1y') {
    startDate = formatDate(subMonths(now, 12), 'yyyy-MM-dd');
    endDate = formatDate(now, 'yyyy-MM-dd');
  }

  // Fetch data when filters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await api.getWeekdayDistribution(
          transactionType === 'all' ? undefined : transactionType as TransactionType,
          startDate,
          endDate
        );
        setData(result);
      } catch (error) {
        console.error('Error fetching weekday distribution:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [transactionType, startDate, endDate]);

  // Transform data for charts
  const transformDataForChart = (type: 'count' | 'total' | 'average' | 'median') => {
    if (!data || !data.weekdays) return [];
    
    // Define the order of weekdays
    const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    return weekdayOrder.map(day => {
      const dayData = data.weekdays[day];
      return {
        name: day,
        Expenses: dayData.expense[type],
        Income: dayData.income[type]
      };
    });
  };

  // Custom tooltip for the bar chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded shadow">
          <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p 
              key={`item-${index}`} 
              className={`text-sm ${entry.name === 'Expenses' ? 'text-rose-600' : 'text-emerald-600'}`}
            >
              {`${entry.name}: ${
                activeTab === 'total' || activeTab === 'average' || activeTab === 'median' 
                  ? formatCurrency(entry.value) 
                  : entry.value.toFixed(0)
              }`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">Weekday Distribution</h3>
        <div className="p-2 rounded-full bg-blue-100 bg-opacity-70">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 000 2h10a1 1 0 100-2H3zm0 4a1 1 0 000 2h6a1 1 0 100-2H3zm0 4a1 1 0 100 2h12a1 1 0 100-2H3z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-end mb-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Transaction Type
          </label>
          <Select.Root 
            value={transactionType} 
            onValueChange={(value) => setTransactionType(value as TransactionType | 'all')}
          >
            <Select.Trigger className="inline-flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400">
              <Select.Value placeholder="Select transaction type" />
              <Select.Icon>
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content className="overflow-hidden bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 z-50">
                <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-default">
                  <ChevronUpIcon className="h-4 w-4" />
                </Select.ScrollUpButton>
                <Select.Viewport className="p-1">
                  <Select.Item value="all" className="relative flex items-center px-8 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white rounded-md outline-none cursor-default">
                    <Select.ItemText>All</Select.ItemText>
                    <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                      <CheckIcon className="h-4 w-4" />
                    </Select.ItemIndicator>
                  </Select.Item>
                  <Select.Item value={TransactionType.EXPENSE} className="relative flex items-center px-8 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white rounded-md outline-none cursor-default">
                    <Select.ItemText>Expenses</Select.ItemText>
                    <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                      <CheckIcon className="h-4 w-4" />
                    </Select.ItemIndicator>
                  </Select.Item>
                  <Select.Item value={TransactionType.INCOME} className="relative flex items-center px-8 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white rounded-md outline-none cursor-default">
                    <Select.ItemText>Income</Select.ItemText>
                    <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                      <CheckIcon className="h-4 w-4" />
                    </Select.ItemIndicator>
                  </Select.Item>
                </Select.Viewport>
                <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-default">
                  <ChevronDownIcon className="h-4 w-4" />
                </Select.ScrollDownButton>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        <div>
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1 text-sm ${period === p.value 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                  : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Tabs.Root 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="flex flex-col"
      >
        <Tabs.List 
          aria-label="Weekday distribution statistics" 
          className="flex border-b border-gray-200 dark:border-gray-700 mb-4"
        >
          <Tabs.Trigger 
            value="average" 
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'average' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Average Amount
          </Tabs.Trigger>
          <Tabs.Trigger 
            value="median" 
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'median' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Median Amount
          </Tabs.Trigger>
          <Tabs.Trigger 
            value="count" 
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'count' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Transaction Count
          </Tabs.Trigger>
          <Tabs.Trigger 
            value="total" 
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'total' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Total Amount
          </Tabs.Trigger>
        </Tabs.List>

        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <Tabs.Content value="total" className="outline-none">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={transformDataForChart('total')}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="Expenses" fill="#EF4444" isAnimationActive={false} />
                    <Bar dataKey="Income" fill="#10B981" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Tabs.Content>
            
            <Tabs.Content value="count" className="outline-none">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={transformDataForChart('count')}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="Expenses" fill="#EF4444" isAnimationActive={false} />
                    <Bar dataKey="Income" fill="#10B981" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Tabs.Content>
            
            <Tabs.Content value="average" className="outline-none">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={transformDataForChart('average')}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="Expenses" fill="#EF4444" isAnimationActive={false} />
                    <Bar dataKey="Income" fill="#10B981" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Tabs.Content>
            
            <Tabs.Content value="median" className="outline-none">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={transformDataForChart('median')}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="Expenses" fill="#EF4444" isAnimationActive={false} />
                    <Bar dataKey="Income" fill="#10B981" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Tabs.Content>
          </>
        )}
      </Tabs.Root>

      {data && (
        <div className="mt-4 text-right text-sm text-gray-500 dark:text-gray-400">
          Based on {data.transaction_count} transactions
        </div>
      )}
    </div>
  );
};

export default WeekdayDistribution;
