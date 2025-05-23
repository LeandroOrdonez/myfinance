import React from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface IncomeExpensesChartProps {
  data: {
    dates: string[];
    projected_income: number[];
    projected_expenses: number[];
  };
}

const IncomeExpensesChart: React.FC<IncomeExpensesChartProps> = ({ data }) => {
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
    income: data.projected_income[index],
    expenses: data.projected_expenses[index],
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

  return (
    <div className="w-full h-[400px] border rounded-lg shadow-sm p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
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
          <Bar dataKey="income" name="Income" fill="#10b981" />
          <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default IncomeExpensesChart;
