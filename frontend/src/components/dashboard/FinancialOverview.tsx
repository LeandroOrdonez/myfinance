import React from 'react';
import { Upload, Download, ArrowUp, ArrowDown, Calculator, TrendingUp, Euro } from 'lucide-react';
import { BaseMetricCard } from './BaseMetricCard';
import { useStatistics } from '../../hooks/useStatistics';
import { Loading } from '../common/Loading';

export const FinancialOverview: React.FC = () => {
  const { statistics, loading, error } = useStatistics();

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Loading variant="skeleton" size="small" />
        <Loading variant="skeleton" size="small" />
        <Loading variant="skeleton" size="small" />
        <Loading variant="skeleton" size="small" />
      </div>
    </div>
  );
  if (error) return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <div className="text-gray-500">{error}</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <div className="text-gray-500">{error}</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <div className="text-gray-500">{error}</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <div className="text-gray-500">{error}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  if (!statistics) return null;

  const calculateChange = (current: number, previous: number): string => {
    if (previous === 0) return '+0.0%';
    const change = ((current - previous) / Math.abs(previous)) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  // Get the current month name and number (1-12) from the statistics date
  const currentDate = new Date(statistics.current_month.date!);
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentMonthNumber = currentDate.getMonth() + 1; // Adding 1 because getMonth() returns 0-11

  // Calculate yearly averages
  const yearlyIncomeAverage = statistics.current_month.yearly_income / currentMonthNumber;
  const yearlyExpenseAverage = statistics.current_month.yearly_expenses / currentMonthNumber;

  // Calculate previous month's yearly averages (using last month's number for division)
  const previousYearlyIncomeAverage = (statistics.previous_year_last_month?.yearly_income ?? 0) / 12;
  const previousYearlyExpenseAverage = (statistics.previous_year_last_month?.yearly_expenses ?? 0) / 12;

  return (
    <div className="space-y-6">
      {/* Top row - Total metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <BaseMetricCard
          title="Total Net Savings"
          Icon={Euro}
          amount={statistics.current_month.total_net_savings}
          change={calculateChange(
            statistics.current_month.total_net_savings,
            statistics.last_month.total_net_savings
          )}
          previousAmount={statistics.last_month.total_net_savings}
          colorType="neutral"
        />
        <BaseMetricCard
          title={`Total Income (${currentDate.getFullYear()})`}
          Icon={Download}
          amount={statistics.current_month.yearly_income}
          change={calculateChange(
            statistics.current_month.yearly_income,
            statistics.last_month.yearly_income
          )}
          previousAmount={statistics.last_month.yearly_income}
          colorType="income"
        />
        <BaseMetricCard
          title={`Total Expenses (${currentDate.getFullYear()})`}
          Icon={Upload}
          amount={statistics.current_month.yearly_expenses}
          change={calculateChange(
            statistics.current_month.yearly_expenses,
            statistics.last_month.yearly_expenses
          )}
          previousAmount={statistics.last_month.yearly_expenses}
          colorType="expense"
        />
        <BaseMetricCard
          title="Yearly Avg. Income"
          Icon={Calculator}
          amount={yearlyIncomeAverage}
          change={calculateChange(
            yearlyIncomeAverage,
            previousYearlyIncomeAverage
          )}
          previousAmount={previousYearlyIncomeAverage}
          colorType="income"
          period={currentMonth}
        />
      </div>

      {/* Bottom row - Modified for yearly averages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <BaseMetricCard
          title={`${currentMonth} Savings Rate`}
          Icon={TrendingUp}
          amount={statistics.current_month.savings_rate}
          change={calculateChange(
            statistics.current_month.savings_rate,
            statistics.last_month.savings_rate
          )}
          previousAmount={statistics.last_month.savings_rate}
          isPercentage={true}
          colorType="neutral"
        />
        <BaseMetricCard
          title={`${currentMonth} Income`}
          Icon={ArrowDown}
          amount={statistics.current_month.period_income}
          change={calculateChange(
            statistics.current_month.period_income,
            statistics.last_month.period_income
          )}
          previousAmount={statistics.last_month.period_income}
          colorType="income"
        />
        <BaseMetricCard
          title={`${currentMonth} Expenses`}
          Icon={ArrowUp}
          amount={statistics.current_month.period_expenses}
          change={calculateChange(
            statistics.current_month.period_expenses,
            statistics.last_month.period_expenses
          )}
          previousAmount={statistics.last_month.period_expenses}
          colorType="expense"
        />
        <BaseMetricCard
          title="Yearly Avg. Expense"
          Icon={Calculator}
          amount={yearlyExpenseAverage}
          change={calculateChange(
            yearlyExpenseAverage,
            previousYearlyExpenseAverage
          )}
          previousAmount={previousYearlyExpenseAverage}
          colorType="expense"
          period={currentMonth}
        />
      </div>
    </div>
  );
}; 