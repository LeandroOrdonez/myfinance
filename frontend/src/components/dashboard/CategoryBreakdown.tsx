import React, { useState } from 'react';
import { 
  ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Treemap, 
} from 'recharts';
import * as Tabs from '@radix-ui/react-tabs';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useCategoryStatistics } from '../../hooks/useCategoryStatistics';
import { useStatistics } from '../../hooks/useStatistics';
import { Loading } from '../common/Loading';
import { TransactionType } from '../../types/transaction';
import { CalendarIcon, CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

const EXPENSE_COLORS = [
  '#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D',
  '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2', '#FEF2F2',
  '#FB7185', '#FDA4AF', '#FECDD3', '#FFE4E6',
  '#F43F5E', '#E11D48', '#BE123C', '#9F1239'
];

const INCOME_COLORS = [
  '#10B981', '#059669', '#047857', '#065F46', '#064E3B',
  '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5', '#ECFDF5',
  '#4ADE80', '#86EFAC', '#BEF264', '#D9F99D',
  '#22C55E', '#16A34A', '#15803D', '#166534'
];

export const CategoryBreakdown: React.FC = () => {
  const [activeTab, setActiveTab] = useState('expenses');
  const [chartType, setChartType] = useState('treemap');
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'yearly' | 'all_time'>('monthly');
  
  const { 
    expenseCategoriesWithPercentage, 
    incomeCategoriesWithPercentage, 
    totalExpenses, 
    totalIncome,
    yearlyTotalExpenses,
    yearlyTotalIncome,
    cumulativeTotalExpenses,
    cumulativeTotalIncome,
    loading: categoryLoading, 
    error: categoryError,
    period,
    date,
    setPeriod,
    setDate,
    refreshCategoryStatistics
  } = useCategoryStatistics();
  
  const { statistics, loading: statsLoading, error: statsError } = useStatistics();
  
  const loading = categoryLoading || statsLoading;
  const error = categoryError || statsError;

  if (loading) return <Loading />;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!statistics) return null;

  // Get current month name from statistics
  const currentDate = new Date(statistics.current_month.date!);
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentMonthNumber = currentDate.getMonth() + 1; // Adding 1 because getMonth() returns 0-11
  const currentYear = currentDate.getFullYear();
  
  // Format data for charts
  // Filter out zero values to avoid empty boxes in treemap
  const expenseData = expenseCategoriesWithPercentage
    .filter(item => {
      const amount = item.period_amount !== undefined ? item.period_amount : item.total_amount;
      return amount > 0;
    })
    .sort((a, b) => {
      // Use period_amount if available, otherwise use total_amount
      const amountA = a.period_amount !== undefined ? a.period_amount : a.total_amount;
      const amountB = b.period_amount !== undefined ? b.period_amount : b.total_amount;
      return amountB - amountA;
    })
    .map((item, index) => ({
      name: item.category,
      value: item.period_amount !== undefined ? item.period_amount : item.total_amount,
      percentage: item.percentage !== undefined ? item.percentage.toFixed(1) : '0.0',
      // Format for treemap display - must be greater than 0
      size: Math.max(item.period_amount !== undefined ? item.period_amount : item.total_amount, 0.01),
      // Add color information for treemap
      color: EXPENSE_COLORS[index % EXPENSE_COLORS.length]
    }));

  // Filter out zero values to avoid empty boxes in treemap
  const incomeData = incomeCategoriesWithPercentage
    .filter(item => {
      const amount = item.period_amount !== undefined ? item.period_amount : item.total_amount;
      return amount > 0; 
    })
    .sort((a, b) => {
      // Use period_amount if available, otherwise use total_amount
      const amountA = a.period_amount !== undefined ? a.period_amount : a.total_amount;
      const amountB = b.period_amount !== undefined ? b.period_amount : b.total_amount;
      return amountB - amountA;
    })
    .map((item, index) => ({
      name: item.category,
      value: item.period_amount !== undefined ? item.period_amount : item.total_amount,
      percentage: item.percentage !== undefined ? item.percentage.toFixed(1) : '0.0',
      // Format for treemap display - must be greater than 0
      size: Math.max(item.period_amount !== undefined ? item.period_amount : item.total_amount, 0.01),
      // Add color information for treemap
      color: INCOME_COLORS[index % INCOME_COLORS.length]
    })); 

  // Calculate yearly averages
  const yearlyIncomeAverage = statistics.current_month.yearly_income / currentMonthNumber;
  const yearlyExpenseAverage = statistics.current_month.yearly_expenses / currentMonthNumber;
  
  // Calculate percentage of monthly income/expense compared to yearly
  const monthlyVsYearlyExpense = (statistics.current_month.period_expenses / yearlyExpenseAverage) * 100;
  const monthlyVsYearlyIncome = (statistics.current_month.period_income / yearlyIncomeAverage) * 100;
    
  // Handle period change
  const handlePeriodChange = (newPeriod: 'monthly' | 'yearly' | 'all_time') => {
    setSelectedPeriod(newPeriod);
    
    // Map selected period to API period - using the new backend values directly
    setPeriod(newPeriod);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getChartTitle = () => {
    const type = activeTab === 'expenses' ? 'Expense' : 'Income';
    return `${currentMonth} ${type} Breakdown`;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-lg font-medium">{getChartTitle()}</h3>
        <div className="flex space-x-4">
          {/* Period selector */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200 transition-colors">
                <span>
                  {selectedPeriod === 'monthly' && 'Monthly'}
                  {selectedPeriod === 'yearly' && 'Yearly'}
                  {selectedPeriod === 'all_time' && 'All Time'}
                </span>
                <ChevronDownIcon className="h-4 w-4 ml-1" />
              </button>
            </DropdownMenu.Trigger>
            
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[220px] bg-white rounded-md p-1 shadow-lg"
                sideOffset={5}
              >
                <DropdownMenu.RadioGroup 
                  value={selectedPeriod} 
                  onValueChange={(value) => handlePeriodChange(value as any)}
                >
                  <DropdownMenu.RadioItem 
                    value="monthly"
                    className="flex items-center px-2 py-2 text-sm rounded hover:bg-gray-100 cursor-pointer"
                  >
                    <span className="flex-grow">Monthly</span>
                    {selectedPeriod === 'monthly' && <CheckIcon className="h-4 w-4 text-blue-600" />}
                  </DropdownMenu.RadioItem>
                  
                  <DropdownMenu.RadioItem 
                    value="yearly"
                    className="flex items-center px-2 py-2 text-sm rounded hover:bg-gray-100 cursor-pointer"
                  >
                    <span className="flex-grow">Yearly</span>
                    {selectedPeriod === 'yearly' && <CheckIcon className="h-4 w-4 text-blue-600" />}
                  </DropdownMenu.RadioItem>
                  
                  <DropdownMenu.RadioItem 
                    value="all_time"
                    className="flex items-center px-2 py-2 text-sm rounded hover:bg-gray-100 cursor-pointer"
                  >
                    <span className="flex-grow">All Time</span>
                    {selectedPeriod === 'all_time' && <CheckIcon className="h-4 w-4 text-blue-600" />}
                  </DropdownMenu.RadioItem>
                </DropdownMenu.RadioGroup>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Chart type selector */}
          <div className="flex space-x-2">
            <button
              onClick={() => setChartType('treemap')}
              className={`px-2 py-1 text-xs rounded ${
                chartType === 'treemap' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Treemap
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-2 py-1 text-xs rounded ${
                chartType === 'bar' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Bar Chart
            </button>
          </div>
        </div>
      </div>
      
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex space-x-4 mb-4">
          <Tabs.Trigger
            value="expenses"
            className={`px-4 py-2 rounded-md ${
              activeTab === 'expenses'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Expenses
          </Tabs.Trigger>
          <Tabs.Trigger
            value="income"
            className={`px-4 py-2 rounded-md ${
              activeTab === 'income'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Income
          </Tabs.Trigger>
        </Tabs.List>

        <div className="h-[400px]">
          {chartType === 'treemap' ? (
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={activeTab === 'expenses' ? (expenseData.length > 0 ? expenseData : [{name: 'No Data', size: 1, value: 0, percentage: '0'}]) 
                                             : (incomeData.length > 0 ? incomeData : [{name: 'No Data', size: 1, value: 0, percentage: '0'}])}
                dataKey="size"
                aspectRatio={4/3}
                stroke="#fff"
                fill={activeTab === 'expenses' ? '#EF4444' : '#10B981'}
                isAnimationActive={false}
              >
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
                          <p className="font-medium">{payload[0].payload.name}</p>
                          <p>{formatCurrency(payload[0].value as number)}</p>
                          <p>{`${payload[0].payload.percentage}%`}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activeTab === 'expenses' ? expenseData : incomeData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" 
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar 
                  dataKey="value" 
                  fill={activeTab === 'expenses' ? '#EF4444' : '#10B981'} 
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Tabs.Root>

      {/* Period-based Comparison - only show for monthly */}
      {selectedPeriod === 'monthly' && (
        <div className="mt-6">
          <h4 className="text-md font-medium mb-2">Monthly vs Yearly Average</h4>
          <p className="text-sm text-gray-600 mb-3">
            How {currentMonth}'s {activeTab} compare to the monthly average for {currentYear}
          </p>
          
          <div className="flex items-center mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5 shadow-inner">
              <div 
                className={`h-2.5 rounded-full ${
                  activeTab === 'expenses' ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ 
                  width: `${Math.min(
                    activeTab === 'expenses' ? monthlyVsYearlyExpense : monthlyVsYearlyIncome, 
                    100
                  )}%` 
                }}
              ></div>
            </div>
            <span className="ml-3 font-medium">
              {formatPercent(
                activeTab === 'expenses' ? monthlyVsYearlyExpense : monthlyVsYearlyIncome
              )}
            </span>
          </div>
          
          <div className="flex justify-between mt-2 text-sm">
            <div className="text-gray-600">
              {activeTab === 'expenses' ? 'This Month:' : 'This Month:'} {' '}
              <span className="font-medium">
                {formatCurrency(
                  activeTab === 'expenses' 
                    ? statistics.current_month.period_expenses 
                    : statistics.current_month.period_income
                )}
              </span>
            </div>
            <div className="text-gray-600">
              {activeTab === 'expenses' ? 'Monthly Average:' : 'Monthly Average:'} {' '}
              <span className="font-medium">
                {formatCurrency(
                  activeTab === 'expenses' 
                    ? yearlyExpenseAverage
                    : yearlyIncomeAverage
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Total Summary */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h5 className="text-sm font-medium text-emerald-600 mb-3">
            {selectedPeriod === 'monthly' && (activeTab === 'expenses' ? 'Monthly Expenses' : 'Monthly Income')}
            {selectedPeriod === 'yearly' && (activeTab === 'expenses' ? 'Yearly Expenses' : 'Yearly Income')}
            {selectedPeriod === 'all_time' && (activeTab === 'expenses' ? 'All-time Expenses' : 'All-time Income')}
          </h5>
          <p className={`text-xl font-bold tracking-tight ${activeTab === 'expenses' ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatCurrency(
              activeTab === 'expenses' 
                ? (selectedPeriod === 'yearly' ? statistics.current_month.yearly_expenses : 
                   selectedPeriod === 'all_time' ? statistics.all_time.total_expenses : 
                   statistics.current_month.period_expenses)
                : (selectedPeriod === 'yearly' ? statistics.current_month.yearly_income : 
                   selectedPeriod === 'all_time' ? statistics.all_time.total_income : 
                   statistics.current_month.period_income)
            )}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h5 className="text-sm font-medium text-emerald-600 mb-3">Top Category</h5>
          <p className={`text-xl font-bold tracking-tight ${activeTab === 'expenses' ? 'text-rose-600' : 'text-emerald-600'}`}>
            {activeTab === 'expenses' 
              ? (expenseData.length > 0 ? expenseData[0].name : 'None')
              : (incomeData.length > 0 ? incomeData[0].name : 'None')
            }
          </p>
          {(activeTab === 'expenses' && expenseData.length > 0) || (activeTab === 'income' && incomeData.length > 0) ? (
            <p className="text-sm text-gray-600 mt-1">
              {activeTab === 'expenses' && expenseData.length > 0 && `${expenseData[0].percentage}% of total`}
              {activeTab === 'income' && incomeData.length > 0 && `${incomeData[0].percentage}% of total`}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};