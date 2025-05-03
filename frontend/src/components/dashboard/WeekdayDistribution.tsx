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
import { api } from '../../services/api';
import { WeekdayDistribution as WeekdayDistributionType } from '../../types/transaction';
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
  { label: '2y', value: '2y' },
  { label: 'All', value: 'all' },
];

const WeekdayDistribution: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WeekdayDistributionType | null>(null);
  const [period, setPeriod] = useState('all');
  const [activeTab, setActiveTab] = useState('average');
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({
    Expenses: true,
    Income: true
  });
  
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
  } else if (period === '2y') {
    startDate = formatDate(subMonths(now, 24), 'yyyy-MM-dd');
    endDate = formatDate(now, 'yyyy-MM-dd');
  }

  // Fetch data when filters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await api.getWeekdayDistribution(
          undefined,
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
  }, [startDate, endDate]);

  // Handle legend click to toggle series visibility
  const handleLegendClick = (entry: any) => {
    // Prevent the default Recharts toggle behavior
    entry.payload.preventDefault = true;
    
    setVisibleSeries(prev => ({
      ...prev,
      [entry.dataKey]: !prev[entry.dataKey]
    }));
    
    // Return false to prevent Recharts' default toggle behavior
    return false;
  };

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

      <Tabs.Root 
        value={activeTab} 
        onValueChange={setActiveTab}
      >
        <div className="flex items-center justify-between gap-2 mb-4">
          <Tabs.List 
            aria-label="Weekday distribution statistics" 
            className="flex gap-2"
          >
            <Tabs.Trigger 
              value="average" 
              className={`px-3 py-1 rounded-md ${activeTab === 'average' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
            >
              Average Amount
            </Tabs.Trigger>
            <Tabs.Trigger 
              value="median" 
              className={`px-3 py-1 rounded-md ${activeTab === 'median' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
            >
              Median Amount
            </Tabs.Trigger>
            <Tabs.Trigger 
              value="count" 
              className={`px-3 py-1 rounded-md ${activeTab === 'count' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
            >
              Transaction Count
            </Tabs.Trigger>
            <Tabs.Trigger 
              value="total" 
              className={`px-3 py-1 rounded-md ${activeTab === 'total' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
            >
              Total Amount
            </Tabs.Trigger>
          </Tabs.List>
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
                    <YAxis tickFormatter={(value) => `€${value}`} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend 
                      onClick={handleLegendClick}
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
                    <Bar dataKey="Expenses" fill="#EF4444" isAnimationActive={false} hide={!visibleSeries['Expenses']} />
                    <Bar dataKey="Income" fill="#10B981" isAnimationActive={false} hide={!visibleSeries['Income']} />
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
                    <Legend 
                      onClick={handleLegendClick}
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
                    <Bar dataKey="Expenses" fill="#EF4444" isAnimationActive={false} hide={!visibleSeries['Expenses']} />
                    <Bar dataKey="Income" fill="#10B981" isAnimationActive={false} hide={!visibleSeries['Income']} />
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
                    <YAxis tickFormatter={(value) => `€${value}`} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend 
                      onClick={handleLegendClick}
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
                    <Bar dataKey="Expenses" fill="#EF4444" isAnimationActive={false} hide={!visibleSeries['Expenses']} />
                    <Bar dataKey="Income" fill="#10B981" isAnimationActive={false} hide={!visibleSeries['Income']} />
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
                    <YAxis tickFormatter={(value) => `€${value}`} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend 
                      onClick={handleLegendClick}
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
                    <Bar dataKey="Expenses" fill="#EF4444" isAnimationActive={false} hide={!visibleSeries['Expenses']} />
                    <Bar dataKey="Income" fill="#10B981" isAnimationActive={false} hide={!visibleSeries['Income']} />
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
