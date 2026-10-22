import React, { useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { usePrivacyMode } from '../../../../contexts/PrivacyContext';
import { formatPrivateAmount } from '../../../../utils/formatPrivateAmount';
import { ActualNetWorthPoint, buildActualHistory } from './actualNetWorthHistory';

interface NetWorthChartProps {
  data: {
    dates: string[];
    projected_net_worth: number[];
    real_projected_net_worth?: number[];
    inflation_rate?: number;
    historical_dates?: string[];
    actual_net_worth?: (number | null)[];
    real_actual_net_worth?: (number | null)[];
  };
}

interface NetWorthPoint extends ActualNetWorthPoint {
  projected?: number;
}

const NetWorthChart: React.FC<NetWorthChartProps> = ({ data }) => {
  const { privacyMode } = usePrivacyMode();
  const [showReal, setShowReal] = useState(false);
  const hasRealData = data?.real_projected_net_worth && data.real_projected_net_worth.length > 0;

  if (!data || !data.dates || data.dates.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center border rounded-lg shadow-sm p-4">
        <p className="text-gray-500">No projection data available</p>
      </div>
    );
  }

  const projectedSeries = showReal && hasRealData ? data.real_projected_net_worth! : data.projected_net_worth;
  // Actual history followed by the projection; the projected line starts at the last actual value so both connect
  const historyPoints: NetWorthPoint[] = buildActualHistory(
    data.historical_dates,
    showReal ? data.real_actual_net_worth : data.actual_net_worth
  ).map((point, i, points) =>
    i === points.length - 1 && point.actual !== undefined ? { ...point, projected: point.actual } : point
  );
  const lastActual = historyPoints[historyPoints.length - 1];
  const hasActuals = historyPoints.length > 0;

  const chartData: NetWorthPoint[] = [
    ...historyPoints,
    ...data.dates.map((date, index) => ({ date, projected: projectedSeries[index] })),
  ];
  const valueLabel = showReal ? 'Real' : 'Nominal';
  const lineColor = showReal ? '#6366f1' : '#10b981';

  // Format currency for tooltip
  const formatCurrency = (value: number) =>
    formatPrivateAmount(
      value,
      privacyMode,
      (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
    );

  // Format date for display
  const formatDate = (dateStr: string) => {
    const [year, month] = dateStr.split('-');
    return `${month}/${year}`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // On the bridge point the projected value duplicates the actual one
      const entries = payload.filter(
        (entry: any) => !(entry.dataKey === 'projected' && entry.payload.actual !== undefined)
      );
      return (
        <div className="bg-white dark:bg-gray-800 border rounded p-2 shadow-md">
          <p className="font-medium">{formatDate(label)}</p>
          {entries.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const inflationPct = data.inflation_rate ? (data.inflation_rate * 100).toFixed(1) : '2.0';

  return (
    <div className="w-full border rounded-lg shadow-sm p-4">
      {hasRealData && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowReal(false)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                !showReal
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Nominal
            </button>
            <button
              onClick={() => setShowReal(true)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                showReal
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Real (Inflation-Adjusted)
            </button>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Inflation rate: {inflationPct}%/year
          </span>
        </div>
      )}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              tick={{ fontSize: 12 }}
              tickMargin={10}
              minTickGap={30}
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 12 }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            {hasActuals && <Legend />}
            {hasActuals && (
              <ReferenceLine x={lastActual.date} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: 'Today', position: 'insideTopRight', fontSize: 12, fill: '#9ca3af' }} />
            )}
            {hasActuals && (
              <Line
                type="monotone"
                dataKey="actual"
                name={`Actual Net Worth (${valueLabel})`}
                stroke={lineColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="projected"
              name={`${hasActuals ? 'Projected ' : ''}Net Worth (${valueLabel})`}
              stroke={lineColor}
              strokeWidth={2}
              strokeDasharray={hasActuals ? '6 4' : undefined}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default NetWorthChart;
