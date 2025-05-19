import React from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface ComparisonSavingsChartProps {
  data: {
    scenario_names: string[];
    dates: string[];
    savings_series: Record<string, number[]>;
  };
}

const ComparisonSavingsChart: React.FC<ComparisonSavingsChartProps> = ({ data }) => {
  if (!data || !data.dates || data.dates.length === 0 || !data.scenario_names || data.scenario_names.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center border rounded-lg shadow-sm p-4">
        <p className="text-gray-500">No comparison data available</p>
      </div>
    );
  }

  // Format the data for the chart
  const chartData = data.dates.map((date, index) => {
    const dataPoint: any = { date };
    data.scenario_names.forEach(scenarioName => {
      if (data.savings_series[scenarioName]) {
        dataPoint[scenarioName] = data.savings_series[scenarioName][index];
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
        <div className="bg-white border rounded p-2 shadow-md">
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

  return (
    <div className="w-full h-[400px] border rounded-lg shadow-sm p-4">
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
  );
};

export default ComparisonSavingsChart;
