import React, { useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface ComparisonNetWorthChartProps {
  data: {
    scenario_names: string[];
    dates: string[];
    net_worth_series: Record<string, number[]>;
    real_net_worth_series?: Record<string, number[]>;
    inflation_rates?: Record<string, number>;
  };
}

const ComparisonNetWorthChart: React.FC<ComparisonNetWorthChartProps> = ({ data }) => {
  const [showReal, setShowReal] = useState(false);
  const hasRealData = data?.real_net_worth_series && Object.keys(data.real_net_worth_series).length > 0;

  if (!data || !data.dates || data.dates.length === 0 || !data.scenario_names || data.scenario_names.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center border rounded-lg shadow-sm p-4">
        <p className="text-muted-foreground">No comparison data available</p>
      </div>
    );
  }

  const activeSeries = showReal && hasRealData ? data.real_net_worth_series! : data.net_worth_series;

  // Format the data for the chart
  const chartData = data.dates.map((date, index) => {
    const dataPoint: any = { date };
    data.scenario_names.forEach(scenarioName => {
      if (activeSeries[scenarioName]) {
        dataPoint[scenarioName] = activeSeries[scenarioName][index];
      }
    });
    return dataPoint;
  });

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

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
      return (
        <div className="bg-background border rounded p-2 shadow-md">
          <p className="font-medium">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
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
          <Legend />
          
          {data.scenario_names.map((scenarioName, index) => (
            <Line
              key={scenarioName}
              type="monotone"
              dataKey={scenarioName}
              name={scenarioName}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
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
