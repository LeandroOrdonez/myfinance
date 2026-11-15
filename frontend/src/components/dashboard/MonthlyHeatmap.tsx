import React, { useState, useEffect, useCallback } from 'react';
import { statisticService } from '../../services/statisticService';
import { usePrivacyMode } from '../../contexts/PrivacyContext';
import { formatPrivateAmount } from '../../utils/formatPrivateAmount';
import { DashboardCard } from './DashboardCard';
import { ChartState } from './ChartState';

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
  const { privacyMode } = usePrivacyMode();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [yearData, setYearData] = useState<Record<string, YearData>>({});
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);

  // Get only the last 3 years of data, sorted descending
  const years = Object.keys(yearData)
    .sort((a, b) => parseInt(b) - parseInt(a))
    .slice(0, 3); // Limit to the last 3 years

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
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
  
  // Format a short accessible label for a month cell
  const formatMonthLabel = (monthData: MonthData | undefined, monthIndex: number, year: string) => {
    const monthName = new Date(0, monthIndex).toLocaleString('default', { month: 'long' });
    if (!monthData) return `${monthName} ${year}: no data`;
    return `${monthName} ${year}: savings rate ${monthData.savingsRate.toFixed(1)}%`;
  };

  const formatCurrency = (value: number) =>
    formatPrivateAmount(
      value,
      privacyMode,
      (n) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n)
    );
  
  const selectedDate = selectedMonth ? new Date(selectedMonth.date) : null;

  return (
    <DashboardCard title="Monthly Savings Rate">
      <ChartState
        loading={loading}
        error={error}
        isEmpty={years.length === 0}
        emptyMessage="No monthly data available yet"
        onRetry={fetchData}
        heightClass="h-[200px]"
      >
      <div className="space-y-3" role="group" aria-label="Savings rate by month">
        {years.map(year => (
          <div key={year} className="flex items-center">
            <div className="w-10 text-xs text-gray-500 dark:text-gray-400">{year}</div>
            <div className="flex-1 grid grid-cols-12 gap-1">
              {Array.from({ length: 12 }, (_, i) => {
                const month = (i + 1).toString().padStart(2, '0');
                const monthData = yearData[year]?.months[month];
                const isSelected = selectedMonth?.month === monthData?.month;
                return (
                  <button
                    key={month}
                    type="button"
                    disabled={!monthData}
                    aria-label={formatMonthLabel(monthData, i, year)}
                    aria-pressed={isSelected}
                    onClick={() => monthData && setSelectedMonth(monthData)}
                    className={`w-full aspect-square rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${getIntensityClass(monthData)} ${
                      monthData ? 'cursor-pointer' : 'cursor-default'
                    } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400" aria-hidden="true">
        <div>Jan</div>
        <div>Dec</div>
      </div>

      {selectedMonth && selectedDate ? (
        <div className="mt-4 rounded-md bg-gray-50 dark:bg-gray-700/50 px-4 py-3 text-sm" aria-live="polite">
          <span className="font-medium dark:text-gray-200">
            {selectedDate.toLocaleString('default', { month: 'long' })} {selectedDate.getFullYear()}
          </span>
          <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
          <span className="text-gray-600 dark:text-gray-300">
            Income {formatCurrency(selectedMonth.income)} · Expenses {formatCurrency(selectedMonth.expenses)} · Net {formatCurrency(selectedMonth.netSavings)} · {selectedMonth.savingsRate.toFixed(1)}% saved
          </span>
        </div>
      ) : (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Select a month to see income, expenses, and savings.</p>
      )}

      <div className="flex items-center mt-4 text-xs text-gray-700 dark:text-gray-300">
        <span className="mr-2">Negative</span>
        <div className="w-3 h-3 bg-red-500 dark:bg-red-600 rounded-sm" />
        <span className="mx-2">No data</span>
        <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm" />
        <span className="mx-2">Savings rate</span>
        <div className="flex space-x-1">
          <div className="w-3 h-3 bg-green-200 dark:bg-green-900 rounded-sm" />
          <div className="w-3 h-3 bg-green-300 dark:bg-green-800 rounded-sm" />
          <div className="w-3 h-3 bg-green-400 dark:bg-green-700 rounded-sm" />
          <div className="w-3 h-3 bg-green-500 dark:bg-green-600 rounded-sm" />
          <div className="w-3 h-3 bg-green-600 dark:bg-green-500 rounded-sm" />
        </div>
      </div>
      </ChartState>
    </DashboardCard>
  );
};
