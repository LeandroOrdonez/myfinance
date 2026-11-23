import React from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { usePrivacyMode } from '../../../../contexts/PrivacyContext';
import { formatPrivateAmount } from '../../../../utils/formatPrivateAmount';

interface InvestmentGrowthChartProps {
  showReal: boolean;
  data: {
    dates: string[];
    projected_investments: number[];
    real_projected_investments?: number[];
    inflation_rate?: number | null;
  };
}

const InvestmentGrowthChart: React.FC<InvestmentGrowthChartProps> = ({ data, showReal }) => {
  const { privacyMode } = usePrivacyMode();
  const hasRealData = data?.real_projected_investments && data.real_projected_investments.length > 0;

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
    investments: showReal && hasRealData ? data.real_projected_investments![index] : data.projected_investments[index],
  }));

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
      return (
        <div className="bg-background border rounded p-2 shadow-md">
          <p className="font-medium">{formatDate(label)}</p>
          <p className="text-purple-500">
            Monthly Investments: {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const valueLabel = showReal ? ' (Real)' : '';

  return (
    <div className="w-full border rounded-lg shadow-sm p-4">

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
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
            <Area
              type="monotone"
              dataKey="investments"
              name={`Monthly Investments${valueLabel}`}
              stroke="#8b5cf6"
              fill="#8b5cf680"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default InvestmentGrowthChart;
