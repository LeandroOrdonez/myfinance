import React from 'react';
import { useStatisticsTimeseries } from '../../hooks/useStatisticsTimeseries';
import { TimeseriesChart } from './TimeseriesChart';
import { TimePeriod } from '../../types/transaction';
import { DashboardCard } from './DashboardCard';
import { ChartState } from './ChartState';

interface FinancialTrendsProps {
  period: TimePeriod;
}

export const FinancialTrends: React.FC<FinancialTrendsProps> = ({ period }) => {
  const { timeseriesData, loading, error, refreshData } = useStatisticsTimeseries(undefined, undefined, period);

  return (
    <DashboardCard title="Financial Trends">
      <ChartState
        loading={loading}
        error={error}
        isEmpty={!timeseriesData || timeseriesData.length === 0}
        onRetry={refreshData}
      >
        <TimeseriesChart data={timeseriesData} />
      </ChartState>
    </DashboardCard>
  );
};
