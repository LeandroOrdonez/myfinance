import { useState, useEffect } from 'react';
import { api } from '../services/api';

export interface ExpenseTypeTimeseriesItem {
  date: string;
  expense_type: string;
  period_amount: number;
  period_transaction_count: number;
}

export const useExpenseTypeTimeseries = (
  expense_type?: string,
  start_date?: string, 
  end_date?: string
) => {
  const [timeseriesData, setTimeseriesData] = useState<ExpenseTypeTimeseriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeseriesData = async () => {
    setLoading(true);
    try {
      const data = await api.getExpenseTypeStatisticsTimeseries(
        expense_type,
        start_date, 
        end_date
      );
      
      // The API returns a root array, so we access it directly
      const items = Array.isArray(data) ? data : [];
      
      // Transform data to ensure numeric values
      const transformedData = items.map((item: any) => ({
        date: item.date,
        expense_type: item.expense_type.toLowerCase(),
        period_amount: Number(item.period_amount) || 0,
        period_transaction_count: Number(item.period_transaction_count) || 0,
      }));
      
      setTimeseriesData(transformedData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch expense type timeseries data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeseriesData();
    // eslint-disable-next-line
  }, [expense_type, start_date, end_date]);

  return {
    timeseriesData,
    loading,
    error,
    refreshData: fetchTimeseriesData
  };
};
