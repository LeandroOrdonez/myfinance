import React from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { usePrivacyMode } from '../../../../contexts/PrivacyContext';
import { formatPrivateAmount } from '../../../../utils/formatPrivateAmount';

interface IncomeExpensesChartProps {
  showReal: boolean;
  data: {
    dates: string[];
    projected_income: number[];
    projected_expenses: number[];
    real_projected_income?: number[];
    real_projected_expenses?: number[];
    inflation_rate?: number | null;
  };
}

const IncomeExpensesChart: React.FC<IncomeExpensesChartProps> = ({ data, showReal }) => {
  const { privacyMode } = usePrivacyMode();
  const hasRealData = data?.real_projected_income && data.real_projected_income.length > 0;

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
    income: showReal && hasRealData ? data.real_projected_income![index] : data.projected_income[index],
    expenses: showReal && hasRealData ? data.real_projected_expenses![index] : data.projected_expenses[index],
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
          <p className="text-emerald-500">
            Income: {formatCurrency(payload[0].value)}
          </p>
          <p className="text-rose-500">
            Expenses: {formatCurrency(payload[1].value)}
          </p>
          <p className="text-primary font-medium">
            Difference: {formatCurrency(payload[0].value - payload[1].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const valueLabel = showReal ? ' (Real)' : ' (Nominal)';

  return (
    <div className="w-full border rounded-lg shadow-sm p-4">

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
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
            <Bar dataKey="income" name={`Income${valueLabel}`} fill="#10b981" />
            <Bar dataKey="expenses" name={`Expenses${valueLabel}`} fill="#f43f5e" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default IncomeExpensesChart;
