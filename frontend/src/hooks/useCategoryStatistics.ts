import { useState, useEffect } from 'react';
import { statisticService } from '../services/statisticService';
import { CategoryStatistics, TransactionType } from '../types/transaction';

type StatisticsPeriod = 'monthly' | 'yearly' | 'all_time';

export const useCategoryStatistics = (initialPeriod: StatisticsPeriod = 'monthly', initialDate?: string) => {
  const [categoryStats, setCategoryStats] = useState<CategoryStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<StatisticsPeriod>(initialPeriod);
  const [date, setDate] = useState<string | undefined>(initialDate);

  const fetchCategoryStatistics = async (
    fetchPeriod: StatisticsPeriod = period,
    fetchDate?: string
  ) => {
    setLoading(true);
    try {
      const data = await statisticService.getCategoryStatistics(fetchPeriod, fetchDate);
      setCategoryStats(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch category statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryStatistics(period, date);
  }, [period, date]);

  // Helper functions to extract and process the data
  const getExpenseCategories = () => {
    return categoryStats.filter(
      (stat) => stat.transaction_type === TransactionType.EXPENSE
    );
  };

  const getIncomeCategories = () => {
    return categoryStats.filter(
      (stat) => stat.transaction_type === TransactionType.INCOME
    );
  };

  const getTotalExpenses = () => {
    return getExpenseCategories().reduce(
      (total, stat) => {
        // Use period_amount if available, otherwise fall back to total_amount
        const amount = stat.period_amount !== undefined ? stat.period_amount : stat.total_amount;
        return total + amount;
      },
      0
    );
  };

  const getTotalIncome = () => {
    return getIncomeCategories().reduce(
      (total, stat) => {
        // Use period_amount if available, otherwise fall back to total_amount
        const amount = stat.period_amount !== undefined ? stat.period_amount : stat.total_amount;
        return total + amount;
      },
      0
    );
  };

  const getCumulativeTotalExpenses = () => {
    return getExpenseCategories().reduce(
      (total, stat) => total + (stat.total_amount_cumulative || stat.total_amount),
      0
    );
  };

  const getCumulativeTotalIncome = () => {
    return getIncomeCategories().reduce(
      (total, stat) => total + (stat.total_amount_cumulative || stat.total_amount),
      0
    );
  };

  const getYearlyTotalExpenses = () => {
    return getExpenseCategories().reduce(
      (total, stat) => total + (stat.yearly_amount || 0),
      0
    );
  };

  const getYearlyTotalIncome = () => {
    return getIncomeCategories().reduce(
      (total, stat) => total + (stat.yearly_amount || 0),
      0
    );
  };

  // Get expenses with percentage (using the API percentages if available)
  const getExpenseCategoriesWithPercentage = () => {
    const total = getTotalExpenses();
    return getExpenseCategories().map((stat) => {
      // If the API already calculated percentages, use them
      if (stat.period_percentage !== undefined) {
        return {
          ...stat,
          percentage: stat.period_percentage
        };
      }
      
      // Otherwise calculate them
      const amount = stat.period_amount !== undefined ? stat.period_amount : stat.total_amount;
      return {
        ...stat,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      };
    });
  };

  // Get income with percentage (using the API percentages if available)
  const getIncomeCategoriesWithPercentage = () => {
    const total = getTotalIncome();
    return getIncomeCategories().map((stat) => {
      // If the API already calculated percentages, use them
      if (stat.period_percentage !== undefined) {
        return {
          ...stat,
          percentage: stat.period_percentage
        };
      }
      
      // Otherwise calculate them
      const amount = stat.period_amount !== undefined ? stat.period_amount : stat.total_amount;
      return {
        ...stat,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      };
    });
  };

  return {
    categoryStats,
    period,
    date,
    setPeriod,
    setDate,
    expenseCategories: getExpenseCategories(),
    incomeCategories: getIncomeCategories(),
    expenseCategoriesWithPercentage: getExpenseCategoriesWithPercentage(),
    incomeCategoriesWithPercentage: getIncomeCategoriesWithPercentage(),
    
    // Period-specific totals (monthly, daily, or all-time)
    totalExpenses: getTotalExpenses(),
    totalIncome: getTotalIncome(),
    
    // Cumulative totals (to-date)
    cumulativeTotalExpenses: getCumulativeTotalExpenses(),
    cumulativeTotalIncome: getCumulativeTotalIncome(),
    
    // Yearly totals
    yearlyTotalExpenses: getYearlyTotalExpenses(),
    yearlyTotalIncome: getYearlyTotalIncome(),
    
    loading,
    error,
    refreshCategoryStatistics: fetchCategoryStatistics
  };
};