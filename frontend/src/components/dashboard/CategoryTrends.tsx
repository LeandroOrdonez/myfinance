import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as Tabs from '@radix-ui/react-tabs';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useCategoryStatistics } from '../../hooks/useCategoryStatistics';
import { useStatisticsTimeseries } from '../../hooks/useStatisticsTimeseries';
import { useStatistics } from '../../hooks/useStatistics';
import { Loading } from '../common/Loading';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';

export const CategoryTrends: React.FC = () => {
  const [activeTab, setActiveTab] = useState('periods');
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
  const { 
    expenseCategories, 
    incomeCategories,
    period,
    date,
    setPeriod,
    setDate,
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
  
  const loading = categoryLoading || timeseriesLoading || statsLoading;
  const error = categoryError || timeseriesError || statsError;
  
  // Update category statistics API period when selectedPeriod changes
  useEffect(() => {
    setPeriod(selectedPeriod);
  }, [selectedPeriod, setPeriod]);

  if (loading) return <Loading />;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!statistics || !timeseriesData || timeseriesData.length === 0) return null;

  // Get top 5 expense and income categories
  const topExpenseCategories = [...expenseCategories]
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 5)
    .map(cat => cat.category);
    
  const topIncomeCategories = [...incomeCategories]
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 5)
    .map(cat => cat.category);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact'
    }).format(value);
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
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Financial Comparison</h3>
        
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center px-3 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200 transition-colors">
              <span>
                {selectedPeriod === 'monthly' && 'Monthly'}
                {selectedPeriod === 'yearly' && 'Yearly'}
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
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex space-x-4 mb-6">
          <Tabs.Trigger
            value="periods"
            className={`px-4 py-2 rounded-md ${
              activeTab === 'periods'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {selectedPeriod === 'monthly' && 'Monthly vs Yearly Average'}
            {selectedPeriod === 'yearly' && 'Yearly Comparison'}
          </Tabs.Trigger>
          <Tabs.Trigger
            value="categories"
            className={`px-4 py-2 rounded-md ${
              activeTab === 'categories'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Top Categories
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="periods" className="h-[400px]">
          <div className="mb-3 text-sm text-gray-600">
            {selectedPeriod === 'monthly' && `Comparing ${currentMonth} ${currentYear} with monthly average for the year`}
            {selectedPeriod === 'yearly' && `Comparing yearly averages for ${currentYear} with last year's averages`}
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={selectedPeriod === 'monthly' ? monthlyData : yearlyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey={selectedPeriod === 'monthly' ? 'Monthly' : 'Yearly'} fill="#6366F1" name={selectedPeriod === 'monthly' ? `${currentMonth} ${currentYear}` : `${currentYear}`} />
              <Bar dataKey={selectedPeriod === 'monthly' ? 'Monthly Average' : 'Previous Year'} fill="#9CA3AF" name={selectedPeriod === 'monthly' ? `Monthly Average (${currentYear})` : `${currentYear - 1}`} />
            </BarChart>
          </ResponsiveContainer>
        </Tabs.Content>

        <Tabs.Content value="categories" className="h-[400px]">
          <div className="mb-4">
            <h4 className="text-md font-medium">
              {selectedPeriod === 'monthly' && `Top 5 Categories (${currentMonth} ${currentYear})`}
              {selectedPeriod === 'yearly' && `Top 5 Categories (${currentYear})`}
            </h4>
            <div className="flex flex-col space-y-4 mt-4">
              {/* Expense Categories */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h5 className="text-sm font-medium text-red-700 mb-3">Expense Categories</h5>
                <div className="space-y-2">
                  {topExpenseCategories.map((category, index) => {
                    const catData = expenseCategories.find(c => c.category === category);
                    if (!catData) return null;
                    
                    // Get the appropriate amount based on the selected period
                    const amount = 
                      catData.period_amount !== undefined ? catData.period_amount : 
                      catData.total_amount;
                    
                    // Use the API-provided percentage if available
                    const percentage = 
                      catData.period_percentage !== undefined ? catData.period_percentage :
                      (amount / (selectedPeriod === 'monthly' ? statistics.current_month.period_expenses : 
                               selectedPeriod === 'yearly' ? statistics.current_month.yearly_expenses :
                               statistics.all_time.total_expenses)) * 100;
                    
                    return (
                      <div key={index} className="flex items-center">
                        <span className="w-32 text-sm truncate">{category}</span>
                        <div className="flex-1 mx-2">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-red-600 h-2.5 rounded-full" 
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Income Categories */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h5 className="text-sm font-medium text-green-700 mb-3">Income Categories</h5>
                <div className="space-y-2">
                  {topIncomeCategories.map((category, index) => {
                    const catData = incomeCategories.find(c => c.category === category);
                    if (!catData) return null;
                    
                    // Get the appropriate amount based on the selected period
                    const amount = 
                      catData.period_amount !== undefined ? catData.period_amount : 
                      catData.total_amount;
                      
                    // Use the API-provided percentage if available
                    const percentage = 
                      catData.period_percentage !== undefined ? catData.period_percentage :
                      (amount / (selectedPeriod === 'monthly' ? statistics.current_month.period_income :
                               selectedPeriod === 'yearly' ? statistics.current_month.yearly_income :
                               statistics.all_time.total_income)) * 100;
                    
                    return (
                      <div key={index} className="flex items-center">
                        <span className="w-32 text-sm truncate">{category}</span>
                        <div className="flex-1 mx-2">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-green-600 h-2.5 rounded-full" 
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
};