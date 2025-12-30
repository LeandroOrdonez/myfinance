import { useState, useEffect } from 'react';
import { statisticService } from '../services/statisticService';

interface Statistics {
  period: 'monthly' | 'all_time';
  date: string | null;
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

interface StatisticsOverview {
  current_month: Statistics;
  last_month: Statistics;
  previous_year_last_month: Statistics | null;
  all_time: Statistics;
}

export const useStatistics = () => {
  const [statistics, setStatistics] = useState<StatisticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const data = await statisticService.getStatisticsOverview();
      setStatistics(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();

    const handleDataUpdate = () => {
      fetchStatistics();
    };

    window.addEventListener('finance-data-updated', handleDataUpdate);
    return () => {
      window.removeEventListener('finance-data-updated', handleDataUpdate);
    };
  }, []);

  return {
    statistics,
    loading,
    error,
    refreshStatistics: fetchStatistics
  };
}; 