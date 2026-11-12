import React from 'react';
import { Target } from 'lucide-react';
import { FinancialSummaryResponse } from '../../types/summary';
import { StatusBadge } from '../common/StatusBadge';
import { DashboardCard } from './DashboardCard';

interface HealthTabProps {
  data: FinancialSummaryResponse;
  formatCurrency: (val: number) => string;
}

export const HealthTab: React.FC<HealthTabProps> = ({ data, formatCurrency }) => {
  const netWorth = data.account_overview.net_worth;
  const projectedGrowth = netWorth > 0
    ? ((data.projections_summary.one_year_outlook.projected_net_worth / netWorth) - 1) * 100
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
      {Object.entries(data.financial_health.metrics).map(([key, metric]) => (
        <DashboardCard
          key={key}
          title={key.replace(/_/g, ' ').toUpperCase()}
          headerExtra={<StatusBadge status={metric.status} />}
          className="flex flex-col justify-between"
        >
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-black text-[var(--color-text-primary)]">
                {metric.score.toFixed(1)}
              </span>
              <span className="text-sm text-[var(--color-text-muted)]">Score</span>
            </div>
            <div className="w-full bg-[var(--color-bg-tertiary)] h-3 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full transition-all duration-1000 ${
                  metric.score > 80 ? 'bg-success' :
                  metric.score > 60 ? 'bg-accent' :
                  metric.score > 40 ? 'bg-warning' :
                  'bg-danger'
                }`}
                style={{ width: `${metric.score}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            Current Value: <span className="font-bold text-[var(--color-text-primary)]">
              {key === 'emergency_fund' ? `${metric.value.toFixed(1)} months` : `${(metric.value * 100).toFixed(1)}%`}
            </span>
          </p>
        </DashboardCard>
      ))}

      <DashboardCard
        title="INVESTED ASSETS"
        headerExtra={<Target size={18} className="text-accent" />}
        className="flex flex-col justify-between"
      >
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-black text-[var(--color-text-primary)]">
            {formatCurrency(data.savings_investment.investment_portfolio_value)}
          </span>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] mt-2">
          Total portfolio value across tracked investment accounts.
        </p>
      </DashboardCard>

      <div className="md:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] p-8 rounded-3xl">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Wealth Projection Assumptions</h2>
            <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
              These estimates assume consistent income and the return rate shown.
              Based on your 1-year outlook, the projected net worth is{' '}
              {formatCurrency(data.projections_summary.one_year_outlook.projected_net_worth)}
              {projectedGrowth !== null
                ? `, an estimated ${projectedGrowth.toFixed(1)}% change from your current net worth.`
                : '. A percentage change cannot be shown because your current net worth is zero or negative.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] p-4 rounded-2xl">
              <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">Assumed Inflation</p>
              <p className="text-lg font-black text-[var(--color-text-primary)]">
                {(data.projections_summary.key_assumptions.inflation_rate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] p-4 rounded-2xl">
              <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">Assumed Return Rate</p>
              <p className="text-lg font-black text-[var(--color-text-primary)]">
                {(data.projections_summary.key_assumptions.investment_return_rate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
