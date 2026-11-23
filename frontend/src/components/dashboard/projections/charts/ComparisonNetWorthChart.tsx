import React, { useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { usePrivacyMode } from '../../../../contexts/PrivacyContext';
import { formatPrivateAmount } from '../../../../utils/formatPrivateAmount';
import { buildActualHistory } from './actualNetWorthHistory';

interface ComparisonNetWorthChartProps {
  data: {
    scenario_names: string[];
    dates: string[];
    net_worth_series: Record<string, (number | null)[]>;
    real_net_worth_series?: Record<string, (number | null)[]>;
    inflation_rates?: Record<string, number>;
    historical_dates?: string[];
    actual_net_worth?: (number | null)[];
    real_actual_net_worth?: (number | null)[];
  };
}

// Prefixed to avoid clashing with scenario names used as data keys
const ACTUAL_KEY = '__actual';

// Values keyed by ACTUAL_KEY or scenario name
type ComparisonPoint = { date: string } & Record<string, number | string | null | undefined>;

const ComparisonNetWorthChart: React.FC<ComparisonNetWorthChartProps> = ({ data }) => {
  const { privacyMode } = usePrivacyMode();
  const [showReal, setShowReal] = useState(false);
  const hasRealData = data?.scenario_names?.every(name => data.real_net_worth_series?.[name]?.some(value => value !== null)) && data.scenario_names.length > 0;

  if (!data || !data.dates || data.dates.length === 0 || !data.scenario_names || data.scenario_names.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center border rounded-lg shadow-sm p-4">
        <p className="text-muted-foreground">No comparison data available</p>
      </div>
    );
  }

  const activeSeries = showReal && hasRealData ? data.real_net_worth_series! : data.net_worth_series;

  // Shared actual history, with every scenario line starting at the last actual value
  const historyPoints: ComparisonPoint[] = buildActualHistory(
    data.historical_dates,
    showReal ? data.real_actual_net_worth : data.actual_net_worth
  ).map(({ date, actual }, i, points) => {
    const isBridge = i === points.length - 1 && actual !== undefined;
    const bridge = isBridge ? Object.fromEntries(data.scenario_names.map(name => [name, actual])) : {};
    return { ...bridge, date, [ACTUAL_KEY]: actual };
  });
  const lastActual = historyPoints[historyPoints.length - 1];
  const hasActuals = historyPoints.length > 0;

  // Format the data for the chart
  const chartData: ComparisonPoint[] = [...historyPoints, ...data.dates.map((date, index) => {
    const dataPoint: ComparisonPoint = { date };
    data.scenario_names.forEach(scenarioName => {
      if (activeSeries[scenarioName]) {
        dataPoint[scenarioName] = activeSeries[scenarioName][index];
      }
    });
    return dataPoint;
  })];

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

  // Generate colors for different scenarios - colorblind-friendly palette
  const colors = ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9'];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // On the bridge point the scenario values duplicate the actual one
      const entries = payload.filter(
        (entry: any) => entry.dataKey === ACTUAL_KEY || entry.payload[ACTUAL_KEY] === undefined
      );
      return (
        <div className="bg-background border rounded p-2 shadow-md">
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

  // Get average inflation rate for display
  const avgInflationRate = data.inflation_rates 
    ? Object.values(data.inflation_rates).reduce((a, b) => a + b, 0) / Object.values(data.inflation_rates).length
    : 0.02;
  const inflationPct = (avgInflationRate * 100).toFixed(1);

  return (
    <div className="w-full">
      {hasRealData && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              aria-pressed={!showReal}
              onClick={() => setShowReal(false)}
              className={`min-h-11 px-3 py-2 text-sm rounded-md transition-colors ${
                !showReal
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Nominal
            </button>
            <button
              aria-pressed={showReal}
              onClick={() => setShowReal(true)}
              className={`min-h-11 px-3 py-2 text-sm rounded-md transition-colors ${
                showReal
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Real (Inflation-Adjusted)
            </button>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Avg. inflation: {inflationPct}%/year
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
            tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
            tickMargin={10}
            minTickGap={30}
          />
          <YAxis 
            tickFormatter={(value) => formatCurrency(value)}
            tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {hasActuals && (
            <ReferenceLine x={lastActual.date} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: 'Last history month', position: 'insideTopRight', fontSize: 12, fill: 'var(--color-text-secondary)' }} />
          )}
          {hasActuals && (
            <Line
              type="monotone"
              dataKey={ACTUAL_KEY}
              name="Actual"
              stroke="#9ca3af"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          )}
          
          {data.scenario_names.map((scenarioName, index) => (
            <Line
              key={scenarioName}
              type="monotone"
              dataKey={scenarioName}
              name={scenarioName}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              strokeDasharray={hasActuals ? '6 4' : undefined}
              dot={false}
              activeDot={{ r: 6 }}
            />
          ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ComparisonNetWorthChart;
