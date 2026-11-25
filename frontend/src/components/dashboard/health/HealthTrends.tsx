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
    investment_rate_scores: number[];
  } | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
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
  investment_rate: number;
  [key: string]: string | number;
}

const HealthTrends: React.FC<HealthTrendsProps> = ({ historyData, loading, error, onRetry }) => {
  const [visibleSeries, setVisibleSeries] = useState<{ [key: string]: boolean }>({
    overall: true,
    savings_rate: false,
    expense_ratio: false,
    budget_adherence: false,
    debt_to_income: false,
    emergency_fund: false,
    spending_stability: false,
    investment_rate: false
  });

  if (loading && !historyData) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-[var(--color-text-muted)]">Loading score history…</p>
      </div>
    );
  }

  if (error && !historyData) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <p className="text-[var(--color-text-muted)]">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:opacity-90"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (!historyData || !historyData.dates || historyData.dates.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-[var(--color-text-muted)] text-center max-w-sm">
          No score history yet. Trends appear once scores exist for multiple months.
        </p>
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
    spending_stability: historyData.spending_stability_scores[index],
    investment_rate: historyData.investment_rate_scores[index]
  }));

  // Define dataset colors
  const colors = {
    overall: '#6366f1', // indigo-500
    savings_rate: '#10b981', // emerald-500
    expense_ratio: '#f59e0b', // amber-500
    budget_adherence: '#06b6d4', // cyan-500
    debt_to_income: '#ec4899', // pink-500
    emergency_fund: '#8b5cf6', // violet-500
    spending_stability: '#14b8a6', // teal-500
    investment_rate: '#f97316' // orange-500
  };

  // Define series configuration
  const series = [
    { id: 'overall', name: 'Overall Score', color: colors.overall },
    { id: 'savings_rate', name: 'Savings Rate', color: colors.savings_rate },
    { id: 'expense_ratio', name: 'Expense Ratio', color: colors.expense_ratio },
    { id: 'budget_adherence', name: 'Budget Adherence', color: colors.budget_adherence },
    { id: 'debt_to_income', name: 'Debt-to-Income', color: colors.debt_to_income },
    { id: 'emergency_fund', name: 'Emergency Fund', color: colors.emergency_fund },
    { id: 'spending_stability', name: 'Spending Stability', color: colors.spending_stability },
    { id: 'investment_rate', name: 'Investment Rate', color: colors.investment_rate }
  ];

  const toggleSeries = (seriesId: string) => {
    setVisibleSeries(prev => ({
      ...prev,
      [seriesId]: !prev[seriesId]
    }));
  };

  const overallScores = historyData.overall_scores;
  const latest = overallScores[overallScores.length - 1];
  const previous = overallScores.length > 1 ? overallScores[overallScores.length - 2] : null;
  const monthDelta = previous === null ? null : Math.round(latest - previous);
  const deltaText = monthDelta === null
    ? 'first month on record'
    : monthDelta === 0
      ? `unchanged vs ${chartData[chartData.length - 2].date}`
      : `${monthDelta > 0 ? '+' : ''}${monthDelta} pts vs ${chartData[chartData.length - 2].date}`;

  const chartSummary = `Score history chart. Overall score ${Math.round(latest)} out of 100, ${deltaText}.` +
    series
      .filter(s => s.id !== 'overall' && visibleSeries[s.id])
      .map(s => {
        const key = `${s.id}_scores` as keyof typeof historyData;
        const values = historyData[key] as number[];
        return `${s.name} latest: ${Math.round(values[values.length - 1])}`;
      })
      .join('. ');

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex flex-wrap gap-2 mb-2"
        role="group"
        aria-label="Toggle chart series"
      >
        {series.map(s => (
          <button
            key={s.id}
            type="button"
            aria-pressed={visibleSeries[s.id]}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors text-[var(--color-text-secondary)]"
            style={{
              borderColor: visibleSeries[s.id] ? s.color : 'var(--color-border)',
              backgroundColor: visibleSeries[s.id] ? `${s.color}1a` : 'transparent'
            }}
            onClick={() => toggleSeries(s.id)}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: s.color, opacity: visibleSeries[s.id] ? 1 : 0.35 }}
            />
            {s.name}
          </button>
        ))}
      </div>

      <p className="text-xs text-[var(--color-text-muted)] mb-2">
        Overall: {Math.round(latest)}/100 · {deltaText}
      </p>

      <div className="h-64" role="img" aria-label={chartSummary}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip
              formatter={(value: number, name: string) => [
                  value.toFixed(0),
                  name
              ]}
              contentStyle={{
                backgroundColor: 'var(--color-tooltip-bg)',
                borderColor: 'var(--color-tooltip-border)',
                color: 'var(--color-tooltip-text)'
              }}
              itemStyle={{ color: 'inherit' }}
              wrapperClassName="tooltip-wrapper"
            />
            <Legend />
            {series.filter(s => visibleSeries[s.id]).map(s => (
              <Line
                key={s.id}
                type="monotone"
                dataKey={s.id}
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
