import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import * as Tabs from '@radix-ui/react-tabs';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useCategoryStatistics } from '../../hooks/useCategoryStatistics';
import { useStatisticsTimeseries } from '../../hooks/useStatisticsTimeseries';
import { useStatistics } from '../../hooks/useStatistics';
import { useExpenseTypeStatistics } from '../../hooks/useExpenseTypeStatistics';
import { Loading } from '../common/Loading';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';

export const CategoryTrends: React.FC = () => {
  const [activeTab, setActiveTab] = useState('expense-types');
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [activeIndex, setActiveIndex] = useState(0);
  
  const { 
    // We only need these for the component
    setPeriod,
    loading: categoryLoading, 
    error: categoryError 
  } = useCategoryStatistics();
  
  const { 
    timeseriesData, 
    loading: timeseriesLoading, 
    error: timeseriesError 
  } = useStatisticsTimeseries();
  
  const { 
    statistics, 
    loading: statsLoading, 
    error: statsError 
  } = useStatistics();

  const {
    essentialExpenses,
    discretionaryExpenses,
    essentialPercentage,
    discretionaryPercentage,
    topEssentialCategories,
    topDiscretionaryCategories,
    setPeriod: setExpenseTypePeriod,
    loading: expenseTypeLoading,
    error: expenseTypeError
  } = useExpenseTypeStatistics(selectedPeriod);
  
  const loading = categoryLoading || timeseriesLoading || statsLoading || expenseTypeLoading;
  const error = categoryError || timeseriesError || statsError || expenseTypeError;
  
  // Update category statistics API period when selectedPeriod changes
  useEffect(() => {
    setPeriod(selectedPeriod);
    setExpenseTypePeriod(selectedPeriod);
  }, [selectedPeriod, setPeriod, setExpenseTypePeriod]);

  if (loading) return <Loading variant="progress" size="medium" />;
  if (error) return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-center mb-5">
        <div className="text-gray-500">{error}</div>
      </div>
    </div>
  );
  if (!statistics || !timeseriesData || timeseriesData.length === 0) return null;

  // We no longer need these since we removed the Top Categories tab
  // and now use the expense type data instead

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact'
    }).format(value);
  };

  // Render active shape for pie chart
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    
    return (
      <g>
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <text x={cx} y={cy} dy={-20} textAnchor="middle" fill={fill} className="text-sm font-medium dark:fill-white dark:stroke-none">
          {payload.name}
        </text>
        <text x={cx} y={cy} dy={10} textAnchor="middle" className="text-xs dark:fill-gray-200 dark:stroke-none">
          {formatCurrency(value)}
        </text>
        <text x={cx} y={cy} dy={30} textAnchor="middle" className="text-xs dark:fill-gray-200 dark:stroke-none">
          {`${(percent * 100).toFixed(0)}%`}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 5}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          className="dark:filter dark:filter-glow"
          style={{ filter: 'url(#glow)' }}
        />
      </g>
    );
  };

  // Get current month name from statistics
  const currentDate = new Date(statistics.current_month.date!);
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentMonthNumber = currentDate.getMonth() + 1; // Adding 1 because getMonth() returns 0-11
  const currentYear = currentDate.getFullYear();

  // Calculate yearly averages
  const yearlyIncomeAverage = statistics.current_month.yearly_income / currentMonthNumber;
  const yearlyExpenseAverage = statistics.current_month.yearly_expenses / currentMonthNumber;

  const previousYearlyIncomeAverage = (statistics.previous_year_last_month?.yearly_income ?? 0) / 12;
  const previousYearlyExpenseAverage = (statistics.previous_year_last_month?.yearly_expenses ?? 0) / 12;

  // Prepare monthly vs yearly data
  const monthlyData = [
    {
      name: 'Income',
      Monthly: statistics.current_month.period_income,
      'Monthly Average': yearlyIncomeAverage
    },
    {
      name: 'Expenses',
      Monthly: statistics.current_month.period_expenses,
      'Monthly Average': yearlyExpenseAverage
    },
    {
      name: 'Net Savings',
      Monthly: statistics.current_month.period_net_savings,
      'Monthly Average': yearlyIncomeAverage - yearlyExpenseAverage
    }
  ];

  // Prepare current year vs previous year data
  const yearlyData = [
    {
      name: 'Income',
      Yearly: yearlyIncomeAverage,
      'Previous Year': previousYearlyIncomeAverage
    },
    {
      name: 'Expenses',
      Yearly: yearlyExpenseAverage,
      'Previous Year': previousYearlyExpenseAverage
    },
    {
      name: 'Net Savings',
      Yearly: yearlyIncomeAverage - yearlyExpenseAverage,
      'Previous Year': previousYearlyIncomeAverage - previousYearlyExpenseAverage
    }
  ];

  // Handle period change
  const handlePeriodChange = (newPeriod: 'monthly' | 'yearly') => {
    setSelectedPeriod(newPeriod);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium dark:text-gray-200">Category Trends</h2>
        
        {/* Period Dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              <span>
                {selectedPeriod === 'monthly' ? 'Monthly' : 'Yearly'}
              </span>
              <ChevronDownIcon className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="bg-white dark:bg-gray-800 rounded-md shadow-lg p-1 min-w-[150px] z-50 border dark:border-gray-700" sideOffset={5}>
              <DropdownMenu.Item
                className="flex items-center px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded cursor-pointer"
                onClick={() => handlePeriodChange('monthly')}
              >
                <span className="flex-1">Monthly</span>
                {selectedPeriod === 'monthly' && <CheckIcon className="h-4 w-4" />}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex items-center px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded cursor-pointer"
                onClick={() => handlePeriodChange('yearly')}
              >
                <span className="flex-1">Yearly</span>
                {selectedPeriod === 'yearly' && <CheckIcon className="h-4 w-4" />}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex space-x-4 mb-4">
          <Tabs.Trigger
            value="expense-types"
            className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'expense-types' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Essential vs Discretionary
          </Tabs.Trigger>
          <Tabs.Trigger
            value="periods"
            className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'periods' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Period Comparison
          </Tabs.Trigger>

        </Tabs.List>

        <Tabs.Content value="expense-types" className="h-[400px]">
          <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            {selectedPeriod === 'monthly' && `Essential vs Discretionary spending for ${currentMonth} ${currentYear}`}
            {selectedPeriod === 'yearly' && `Essential vs Discretionary spending for ${currentYear}`}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100%-2rem)]">
            {/* Pie Chart */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full max-h-[370px]">
              <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Spending Distribution</h3>
              <div className="flex-1 flex items-center justify-center min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      data={[
                        { name: 'Essential', value: essentialExpenses?.period_amount || 0, fill: '#4F46E5' },
                        { name: 'Discretionary', value: discretionaryExpenses?.period_amount || 0, fill: '#EC4899' }
                      ]}
                      stroke="rgba(0, 0, 0, 0.05)"
                      className="dark:stroke-gray-700"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                    >
                      <Cell key="cell-0" fill="#4F46E5" className="dark:fill-indigo-500" />
                      <Cell key="cell-1" fill="#EC4899" className="dark:fill-pink-500" />
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'var(--color-tooltip-bg)', 
                        borderColor: 'var(--color-tooltip-border)',
                        color: 'var(--color-tooltip-text)',
                        borderRadius: '0.375rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                      itemStyle={{ color: 'inherit' }}
                      wrapperClassName="tooltip-wrapper"
                      labelStyle={{ color: 'var(--color-tooltip-text)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center space-x-6 mt-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-500 mr-2 shadow-sm"></div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">Essential ({Math.round(essentialPercentage)}%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-pink-600 dark:bg-pink-500 mr-2 shadow-sm"></div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">Discretionary ({Math.round(discretionaryPercentage)}%)</span>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="flex flex-col space-y-4">
              {/* Essential Categories */}
              <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full max-h-[180px]">
                <h5 className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-3">Essential Expenses</h5>
                <div className="space-y-2">
                  {topEssentialCategories.map((category, index) => {
                    return (
                      <div key={index} className="flex items-center">
                        <span className="w-32 text-sm truncate dark:text-gray-300">{category.category}</span>
                        <div className="flex-1 mx-2">
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                            <div 
                              className="bg-indigo-600 dark:bg-indigo-500 h-2.5 rounded-full shadow-inner" 
                              style={{ width: `${Math.min(category.period_percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formatCurrency(category.period_amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium dark:text-gray-300">Total Essential</span>
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(essentialExpenses?.period_amount || 0)}
                    </span>
                  </div>
                </div>
              </div>
                
              {/* Discretionary Categories */}
              <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full max-h-[180px]">
                <h5 className="text-sm font-medium text-pink-600 dark:text-pink-400 mb-3">Discretionary Expenses</h5>
                <div className="space-y-2">
                  {topDiscretionaryCategories.map((category, index) => {
                    return (
                      <div key={index} className="flex items-center">
                        <span className="w-32 text-sm truncate dark:text-gray-300">{category.category}</span>
                        <div className="flex-1 mx-2">
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                            <div 
                              className="bg-pink-600 dark:bg-pink-500 h-2.5 rounded-full shadow-inner" 
                              style={{ width: `${Math.min(category.period_percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formatCurrency(category.period_amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium dark:text-gray-300">Total Discretionary</span>
                    <span className="text-sm font-medium text-pink-600 dark:text-pink-400">
                      {formatCurrency(discretionaryExpenses?.period_amount || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="periods" className="h-[400px]">
          <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            {selectedPeriod === 'monthly' && `Comparing ${currentMonth} ${currentYear} with monthly average for the year`}
            {selectedPeriod === 'yearly' && `Comparing yearly averages for ${currentYear} with last year's averages`}
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={selectedPeriod === 'monthly' ? monthlyData : yearlyData}
              margin={{ top: 10, right: 20, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: 'currentColor' }}
                stroke="#9ca3af"
                className="dark:text-gray-400"
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)} 
                tick={{ fontSize: 12, fill: 'currentColor' }}
                stroke="#9ca3af"
                className="dark:text-gray-400"
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(value) => value}
                contentStyle={{ 
                  backgroundColor: 'var(--color-tooltip-bg)', 
                  borderColor: 'var(--color-tooltip-border)',
                  color: 'var(--color-tooltip-text)'
                }}
                itemStyle={{ color: 'inherit' }}
                wrapperClassName="tooltip-wrapper"
              />
              <Legend 
                align="center" 
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: 10 }}
                height={50}
              />
              <Bar dataKey={selectedPeriod === 'monthly' ? 'Monthly' : 'Yearly'} fill="#6366F1" name={selectedPeriod === 'monthly' ? `${currentMonth} ${currentYear}` : `${currentYear}`} />
              <Bar dataKey={selectedPeriod === 'monthly' ? 'Monthly Average' : 'Previous Year'} fill="#9CA3AF" name={selectedPeriod === 'monthly' ? `Monthly Average (${currentYear})` : `${currentYear - 1}`} />
            </BarChart>
          </ResponsiveContainer>
        </Tabs.Content>


      </Tabs.Root>
    </div>
  );
};