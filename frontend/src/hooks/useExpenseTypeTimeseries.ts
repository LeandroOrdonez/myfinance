import { useState, useEffect } from 'react';
import { statisticService } from '../services/statisticService';

export interface ExpenseTypeTimeseriesItem {
  date: string;
  expense_type: string;
  period_amount: number;
  period_transaction_count: number;
  period_percentage: number;
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
      const data = await statisticService.getExpenseTypeStatisticsTimeseries(
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
        period_percentage: Number(item.period_percentage) || 0,
      }));
      
      // Calculate period_percentage if not provided by the API
      // Group by date to calculate totals and percentages
      const dateGroups = transformedData.reduce((groups: Record<string, any[]>, item) => {
        if (!groups[item.date]) {
          groups[item.date] = [];
        }
        groups[item.date].push(item);
        return groups;
      }, {});
      
      // Calculate percentages for each date group
      const dataWithPercentages = transformedData.map(item => {
        const dateItems = dateGroups[item.date];
        const totalAmount = dateItems.reduce((sum, di) => sum + di.period_amount, 0);
        
        // If period_percentage is already set from the API, use it
        // Otherwise calculate it based on the total amount for that date
        if (item.period_percentage === 0 && totalAmount > 0) {
          return {
            ...item,
            period_percentage: (item.period_amount / totalAmount) * 100
          };
        }
        return item;
      });
      
      setTimeseriesData(dataWithPercentages);
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
