import React from 'react';
import { Loading } from '../common/Loading';
import { useStatisticsTimeseries } from '../../hooks/useStatisticsTimeseries';
import { TimeseriesChart } from './TimeseriesChart';

export const FinancialTrends: React.FC = () => {
  const { timeseriesData, loading, error } = useStatisticsTimeseries();
  console.log('Timeseries data in trends:', timeseriesData);

  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4">Financial Trends</h3>
      {loading ? (
        <Loading />
      ) : timeseriesData && timeseriesData.length > 0 ? (
        <TimeseriesChart data={timeseriesData} />
      ) : (
        <div className="h-[400px] flex items-center justify-center text-gray-500">
          No data available
        </div>
      )}
    </div>
  );
}; 