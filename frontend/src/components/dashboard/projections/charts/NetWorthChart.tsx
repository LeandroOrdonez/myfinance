import React, { useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface NetWorthChartProps {
  data: {
    dates: string[];
    projected_net_worth: number[];
    real_projected_net_worth?: number[];
    inflation_rate?: number;
  };
}

const NetWorthChart: React.FC<NetWorthChartProps> = ({ data }) => {
  const [showReal, setShowReal] = useState(false);
  const hasRealData = data?.real_projected_net_worth && data.real_projected_net_worth.length > 0;

  if (!data || !data.dates || data.dates.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center border rounded-lg shadow-sm p-4">
        <p className="text-gray-500">No projection data available</p>
      </div>
    );
  }

  // Format the data for the chart
  const chartData = data.dates.map((date, index) => ({
    date,
    netWorth: data.projected_net_worth[index],
    realNetWorth: hasRealData ? data.real_projected_net_worth![index] : undefined,
  }));

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

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border rounded p-2 shadow-md">
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
            {!showReal ? (
              <Line
                type="monotone"
                dataKey="netWorth"
                name="Net Worth (Nominal)"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            ) : (
              <Line
                type="monotone"
                dataKey="realNetWorth"
                name="Net Worth (Real)"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default NetWorthChart;
