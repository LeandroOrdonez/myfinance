import { useState, useEffect } from 'react';
import { statisticService } from '../services/statisticService';
import { TransactionType, TimePeriod } from '../types/transaction';

export interface CategoryTimeseriesData {
  id: number;
  period: string;
  date: string;
  category_name: string;
  transaction_type: string;
  expense_type: string | null;
  period_amount: number;
  period_transaction_count: number;
  period_percentage: number;
  total_amount: number;
  total_transaction_count: number;
  average_transaction_amount: number;
  yearly_amount: number;
  yearly_transaction_count: number;
}

export const useCategoryTimeseries = (
  transaction_type?: TransactionType,
  category_name?: string,
  start_date?: string, 
  end_date?: string,
  time_period?: TimePeriod
) => {
  const [timeseriesData, setTimeseriesData] = useState<CategoryTimeseriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeseriesData = async () => {
    setLoading(true);
    try {
      const data = await statisticService.getCategoryStatisticsTimeseries(
        transaction_type,
        category_name,
        start_date, 
        end_date,
        time_period
      );
      
      // Transform data to ensure numeric values
      const transformedData = data.map((item: any) => ({
        ...item,
        period_amount: Number(item.period_amount) || 0,
        period_transaction_count: Number(item.period_transaction_count) || 0,
        period_percentage: Number(item.period_percentage) || 0,
        total_amount: Number(item.total_amount) || 0,
        total_transaction_count: Number(item.total_transaction_count) || 0,
        average_transaction_amount: Number(item.average_transaction_amount) || 0,
        yearly_amount: Number(item.yearly_amount) || 0,
        yearly_transaction_count: Number(item.yearly_transaction_count) || 0,
      }));
      
      setTimeseriesData(transformedData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch category timeseries data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeseriesData();
    // eslint-disable-next-line
  }, [transaction_type, category_name, start_date, end_date, time_period]);

  return {
    timeseriesData,
    loading,
    error,
    refreshData: fetchTimeseriesData
  };
};
