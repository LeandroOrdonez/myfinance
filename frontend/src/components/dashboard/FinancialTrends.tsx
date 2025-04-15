import React from 'react';
import { Loading } from '../common/Loading';
import { useStatisticsTimeseries } from '../../hooks/useStatisticsTimeseries';
import { TimeseriesChart } from './TimeseriesChart';

import { subMonths, startOfYear, format as formatDate, parseISO } from 'date-fns';

const PERIODS = [
  { label: '3m', value: '3m' },
  { label: '6m', value: '6m' },
  { label: 'YTD', value: 'ytd' },
  { label: '1y', value: '1y' },
  { label: 'All', value: 'all' },
];

export const FinancialTrends: React.FC = () => {
  const [period, setPeriod] = React.useState('all');

  // Compute start_date and end_date based on selected period
  const now = new Date('2025-04-15T23:50:45+02:00'); // Use latest source of truth
  let start_date: string | undefined = undefined;
  let end_date: string | undefined = undefined;

  if (period === '3m') {
    start_date = formatDate(subMonths(now, 3), 'yyyy-MM-01');
    end_date = formatDate(now, 'yyyy-MM-dd');
  } else if (period === '6m') {
    start_date = formatDate(subMonths(now, 6), 'yyyy-MM-01');
    end_date = formatDate(now, 'yyyy-MM-dd');
  } else if (period === 'ytd') {
    start_date = formatDate(startOfYear(now), 'yyyy-MM-01');
    end_date = formatDate(now, 'yyyy-MM-dd');
  } else if (period === '1y') {
    start_date = formatDate(subMonths(now, 12), 'yyyy-MM-01');
    end_date = formatDate(now, 'yyyy-MM-dd');
  }

  const { timeseriesData, loading, error } = useStatisticsTimeseries(start_date, end_date);

  return (
    <div className="bg-white p-6 rounded-lg shadow">

      <h3 className="text-lg font-medium mb-4">Financial Trends</h3>
      {loading ? (
        <Loading />
      ) : timeseriesData && timeseriesData.length > 0 ? (
        <TimeseriesChart data={timeseriesData} period={period} setPeriod={setPeriod} PERIODS={PERIODS} />
      ) : (
        <div className="h-[400px] flex items-center justify-center text-gray-500">
          No data available
        </div>
      )}
    </div>
  );
}; 