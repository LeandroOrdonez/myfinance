import React, { useState, useEffect } from 'react';
import { statisticService } from '../../services/statisticService';
import { Loading } from '../common/Loading';

interface MonthlyStatistics {
  period: 'monthly' | 'all_time';
  date: string;
  period_income: number;
  period_expenses: number;
  period_net_savings: number;
  savings_rate: number;
  total_income: number;
  total_expenses: number;
  total_net_savings: number;
  income_count: number;
  expense_count: number;
  average_income: number;
  average_expense: number;
  yearly_income: number;
  yearly_expenses: number;
}

interface MonthData {
  month: string; // Format: "YYYY-MM"
  income: number;
  expenses: number;
  netSavings: number;
  savingsRate: number;
  date: string; // Full date string
}

interface YearData {
  year: string;
  months: Record<string, MonthData>; // Month number (1-12) to month data
}

export const MonthlyHeatmap: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [yearData, setYearData] = useState<Record<string, YearData>>({});
  
  // Get only the last 3 years of data, sorted descending
  const years = Object.keys(yearData)
    .sort((a, b) => parseInt(b) - parseInt(a))
    .slice(0, 3); // Limit to the last 3 years

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get all available monthly data
        const data = await statisticService.getStatisticsTimeseries();
        
        // Process the data into year-month format
        const processedData: Record<string, YearData> = {};
        
        data.forEach((stat: MonthlyStatistics) => {
          if (stat.date) {
            const date = new Date(stat.date);
            const year = date.getFullYear().toString();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            
            // Initialize the year if it doesn't exist
            if (!processedData[year]) {
              processedData[year] = {
                year,
                months: {}
              };
            }
            
            // Add month data
            processedData[year].months[month] = {
              month: `${year}-${month}`,
              income: stat.period_income,
              expenses: stat.period_expenses,
              netSavings: stat.period_net_savings,
              savingsRate: stat.savings_rate,
              date: stat.date
            };
          }
        });
        
        setYearData(processedData);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch statistics data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const getIntensityClass = (monthData: MonthData | undefined) => {
    if (!monthData) return 'bg-gray-100 dark:bg-gray-800';
    
    // Using net savings rate for intensity
    const savingsRate = monthData.savingsRate;
    
    // Color classes based on savings rate
    if (savingsRate <= 0) return 'bg-red-500 dark:bg-red-600';
    if (savingsRate < 10) return 'bg-green-200 dark:bg-green-900';
    if (savingsRate < 20) return 'bg-green-300 dark:bg-green-800';
    if (savingsRate < 30) return 'bg-green-400 dark:bg-green-700';
    if (savingsRate < 40) return 'bg-green-500 dark:bg-green-600';
    return 'bg-green-600 dark:bg-green-500';
  };
  
  // Format tooltip content
  const formatTooltip = (monthData: MonthData | undefined) => {
    if (!monthData) return 'No data available';
    
    const date = new Date(monthData.date);
    const monthName = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    
    return `${monthName} ${year}\nIncome: ${formatCurrency(monthData.income)}\nExpenses: ${formatCurrency(monthData.expenses)}\nNet: ${formatCurrency(monthData.netSavings)}\nRate: ${monthData.savingsRate.toFixed(1)}%`;
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  if (loading) return (<Loading variant="progress" size="medium" />);
  if (error) return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-center mb-5">
        <div className="text-gray-500">{error}</div>
      </div>
    </div>
  );
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-md hover:shadow-lg transition-all duration-300">
      <h3 className="text-lg font-medium mb-4 dark:text-gray-100">Monthly Financial Activity</h3>
      
      <div className="space-y-3">
        {years.map(year => (
          <div key={year} className="flex items-center">
            <div className="w-10 text-xs text-gray-500 dark:text-gray-400">{year}</div>
            <div className="flex-1 grid grid-cols-12 gap-1">
              {Array.from({ length: 12 }, (_, i) => {
                const month = (i + 1).toString().padStart(2, '0');
                const monthData = yearData[year]?.months[month];
                return (
                  <div
                    key={month}
                    className={`w-full aspect-square rounded-sm cursor-pointer ${getIntensityClass(monthData)}`}

                    title={monthData ? formatTooltip(monthData) : `No data for ${new Date(0, i).toLocaleString('default', { month: 'long' })} ${year}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
        <div>Jan</div>
        <div>Dec</div>
      </div>
      
      <div className="flex items-center mt-4 text-xs text-gray-700 dark:text-gray-300">
        <span className="mr-2">Less</span>
        <div className="flex space-x-1">
        <div className="w-3 h-3 bg-red-500 dark:bg-red-600 rounded-sm"></div>
          <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-200 dark:bg-green-900 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-300 dark:bg-green-800 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-400 dark:bg-green-700 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-500 dark:bg-green-600 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-600 dark:bg-green-500 rounded-sm"></div>
        </div>
        <span className="ml-2">More</span>
      </div>
      

    </div>
  );
};
