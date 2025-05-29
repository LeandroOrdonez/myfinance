import React from 'react';
import { Loading } from '../common/Loading';
import { useStatisticsTimeseries } from '../../hooks/useStatisticsTimeseries';
import { TimeseriesChart } from './TimeseriesChart';
import { TimePeriod } from '../../types/transaction';

const PERIODS = [
  { label: '3M', value: TimePeriod.THREE_MONTHS },
  { label: '6M', value: TimePeriod.SIX_MONTHS },
  { label: 'YTD', value: TimePeriod.YEAR_TO_DATE },
  { label: '1Y', value: TimePeriod.ONE_YEAR },
  { label: '2Y', value: TimePeriod.TWO_YEARS },
  { label: 'All', value: TimePeriod.ALL_TIME },
];

export const FinancialTrends: React.FC = () => {
  const [period, setPeriod] = React.useState<TimePeriod>(TimePeriod.ONE_YEAR);
  const { timeseriesData, loading } = useStatisticsTimeseries(undefined, undefined, period);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">Financial Trends</h3>
        <div className="p-2 rounded-full bg-blue-100 bg-opacity-70">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 000 2h10a1 1 0 100-2H3zm0 4a1 1 0 000 2h6a1 1 0 100-2H3zm0 4a1 1 0 100 2h12a1 1 0 100-2H3z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      
      {loading ? (
        <Loading />
      ) : timeseriesData && timeseriesData.length > 0 ? (
        <TimeseriesChart data={timeseriesData} period={period} setPeriod={setPeriod} PERIODS={PERIODS} />
      ) : (
        <div className="h-[400px] flex items-center justify-center text-gray-500 dark:text-gray-400">
          No data available
        </div>
      )}
    </div>
  );
}; 