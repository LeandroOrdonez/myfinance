import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface HealthTrendsProps {
  historyData: {
    dates: string[];
    overall_scores: number[];
    savings_rate_scores: number[];
    expense_ratio_scores: number[];
    budget_adherence_scores: number[];
    debt_to_income_scores: number[];
    emergency_fund_scores: number[];
    spending_stability_scores: number[];
  } | null;
}

interface DataPoint {
  date: string;
  overall: number;
  savings_rate: number;
  expense_ratio: number;
  budget_adherence: number;
  debt_to_income: number;
  emergency_fund: number;
  spending_stability: number;
  [key: string]: string | number;
}

const HealthTrends: React.FC<HealthTrendsProps> = ({ historyData }) => {
  const [visibleSeries, setVisibleSeries] = useState<{ [key: string]: boolean }>({
    overall: true,
    savings_rate: false,
    expense_ratio: false,
    budget_adherence: false,
    debt_to_income: false,
    emergency_fund: false,
    spending_stability: false
  });

  if (!historyData || !historyData.dates || historyData.dates.length === 0) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Financial Health Trends</h3>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">No historical data available</p>
        </div>
      </div>
    );
  }

  // Format dates for display and transform data for Recharts
  const chartData: DataPoint[] = historyData.dates.map((date, index) => ({
    date: format(new Date(date), 'MMM yyyy'),
    overall: historyData.overall_scores[index],
    savings_rate: historyData.savings_rate_scores[index],
    expense_ratio: historyData.expense_ratio_scores[index],
    budget_adherence: historyData.budget_adherence_scores[index],
    debt_to_income: historyData.debt_to_income_scores[index],
    emergency_fund: historyData.emergency_fund_scores[index],
    spending_stability: historyData.spending_stability_scores[index]
  }));

  // Define dataset colors
  const colors = {
    overall: '#6366f1', // indigo-500
    savings_rate: '#10b981', // emerald-500
    expense_ratio: '#f59e0b', // amber-500
    budget_adherence: '#06b6d4', // cyan-500
    debt_to_income: '#ec4899', // pink-500
    emergency_fund: '#8b5cf6', // violet-500
    spending_stability: '#ef4444' // red-500
  };

  // Define series configuration
  const series = [
    {
      id: 'overall',
      name: 'Overall Score',
      dataKey: 'overall',
      color: colors.overall,
      visible: visibleSeries.overall
    },
    {
      id: 'savings_rate',
      name: 'Savings Rate',
      dataKey: 'savings_rate',
      color: colors.savings_rate,
      visible: visibleSeries.savings_rate
    },
    {
      id: 'expense_ratio',
      name: 'Expense Ratio',
      dataKey: 'expense_ratio',
      color: colors.expense_ratio,
      visible: visibleSeries.expense_ratio
    },
    {
      id: 'budget_adherence',
      name: 'Budget Adherence',
      dataKey: 'budget_adherence',
      color: colors.budget_adherence,
      visible: visibleSeries.budget_adherence
    },
    {
      id: 'debt_to_income',
      name: 'Debt-to-Income',
      dataKey: 'debt_to_income',
      color: colors.debt_to_income,
      visible: visibleSeries.debt_to_income
    },
    {
      id: 'emergency_fund',
      name: 'Emergency Fund',
      dataKey: 'emergency_fund',
      color: colors.emergency_fund,
      visible: visibleSeries.emergency_fund
    },
    {
      id: 'spending_stability',
      name: 'Spending Stability',
      dataKey: 'spending_stability',
      color: colors.spending_stability,
      visible: visibleSeries.spending_stability
    }
  ];

  const toggleSeries = (seriesId: string) => {
    setVisibleSeries(prev => ({
      ...prev,
      [seriesId]: !prev[seriesId]
    }));
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-2">Financial Health Trends</h3>
      
      <div className="flex flex-wrap gap-2 mb-3">
        {series.map(s => (
          <button
            key={s.id}
            className={`px-2 py-1 text-xs rounded-full border`}
            style={{
              backgroundColor: visibleSeries[s.id] ? s.color : 'white',
              borderColor: s.color,
              color: visibleSeries[s.id] ? 'white' : 'rgb(55, 65, 81)'
            }}
            onClick={() => toggleSeries(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            {series.filter(s => visibleSeries[s.id]).map(s => (
              <Line 
                key={s.id}
                type="monotone" 
                dataKey={s.dataKey} 
                name={s.name}
                stroke={s.color} 
                activeDot={{ r: 8 }} 
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HealthTrends;
