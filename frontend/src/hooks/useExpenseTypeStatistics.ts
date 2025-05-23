import { useState, useEffect } from 'react';
import { statisticService } from '../services/statisticService';

// Define the expense type statistics interface
export interface ExpenseTypeStatistics {
  expense_type: string;
  period: string;
  date: string | null;
  period_amount: number;
  period_transaction_count: number;
  period_percentage: number;
  total_amount: number;
  transaction_count: number;
  total_amount_cumulative: number;
  total_transaction_count: number;
  average_transaction_amount: number;
  yearly_amount: number;
  yearly_transaction_count: number;
  categories: {
    category: string;
    period_amount: number;
    period_transaction_count: number;
    period_percentage: number;
  }[];
}

type StatisticsPeriod = 'monthly' | 'yearly' | 'all_time';

export const useExpenseTypeStatistics = (initialPeriod: StatisticsPeriod = 'monthly', initialDate?: string) => {
  const [expenseTypeStats, setExpenseTypeStats] = useState<ExpenseTypeStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<StatisticsPeriod>(initialPeriod);
  const [date, setDate] = useState<string | undefined>(initialDate);

  const fetchExpenseTypeStatistics = async (
    fetchPeriod: StatisticsPeriod = period,
    fetchDate?: string
  ) => {
    setLoading(true);
    try {
      const data = await statisticService.getExpenseTypeStatistics(fetchPeriod, fetchDate);
      setExpenseTypeStats(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch expense type statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenseTypeStatistics(period, date);
  }, [period, date]);

  // Helper functions to extract and process the data
  const getEssentialExpenses = () => {
    return expenseTypeStats.find(stat => stat.expense_type === 'Essential') || null;
  };

  const getDiscretionaryExpenses = () => {
    return expenseTypeStats.find(stat => stat.expense_type === 'Discretionary') || null;
  };

  const getTotalExpenses = () => {
    return expenseTypeStats.reduce(
      (total, stat) => total + stat.period_amount,
      0
    );
  };

  const getEssentialPercentage = () => {
    const essential = getEssentialExpenses();
    const total = getTotalExpenses();
    return total > 0 && essential ? (essential.period_amount / total) * 100 : 0;
  };

  const getDiscretionaryPercentage = () => {
    const discretionary = getDiscretionaryExpenses();
    const total = getTotalExpenses();
    return total > 0 && discretionary ? (discretionary.period_amount / total) * 100 : 0;
  };

  // Get top categories for each expense type
  const getTopEssentialCategories = (limit: number = 3) => {
    const essential = getEssentialExpenses();
    if (!essential) return [];
    
    return [...essential.categories]
      .sort((a, b) => b.period_amount - a.period_amount)
      .slice(0, limit);
  };

  const getTopDiscretionaryCategories = (limit: number = 3) => {
    const discretionary = getDiscretionaryExpenses();
    if (!discretionary) return [];
    
    return [...discretionary.categories]
      .sort((a, b) => b.period_amount - a.period_amount)
      .slice(0, limit);
  };

  return {
    expenseTypeStats,
    period,
    date,
    setPeriod,
    setDate,
    essentialExpenses: getEssentialExpenses(),
    discretionaryExpenses: getDiscretionaryExpenses(),
    totalExpenses: getTotalExpenses(),
    essentialPercentage: getEssentialPercentage(),
    discretionaryPercentage: getDiscretionaryPercentage(),
    topEssentialCategories: getTopEssentialCategories(),
    topDiscretionaryCategories: getTopDiscretionaryCategories(),
    loading,
    error,
    refreshExpenseTypeStatistics: fetchExpenseTypeStatistics
  };
};
