import React from 'react';
import { FinancialSummaryResponse } from '../../types/summary';
import { StatusBadge } from '../common/StatusBadge';
import { DashboardCard } from './DashboardCard';

interface HealthTabProps {
  data: FinancialSummaryResponse;
  formatCurrency: (val: number) => string;
}

export const HealthTab: React.FC<HealthTabProps> = ({ data, formatCurrency }) => {
  const projectedGrowth = ((data.projections_summary.one_year_outlook.projected_net_worth / data.account_overview.net_worth) - 1) * 100;

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
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {metric.score.toFixed(1)}
              </span>
              <span className="text-sm text-slate-400 dark:text-gray-500">Score</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-gray-700 h-3 rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full transition-all duration-1000 ${
                  metric.score > 80 ? 'bg-emerald-500' : 
                  metric.score > 60 ? 'bg-indigo-500' : 
                  metric.score > 40 ? 'bg-amber-500' : 
                  metric.score > 20 ? 'bg-rose-500' : 'bg-rose-700'
                }`} 
                style={{ width: `${metric.score}%` }} 
              />
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-gray-400 mt-2">
            Current Value: <span className="font-bold text-slate-900 dark:text-white">
              {key === 'emergency_fund' ? `${metric.value.toFixed(1)} months` : `${(metric.value * 100).toFixed(1)}%`}
            </span>
          </p>
        </DashboardCard>
      ))}
      
      <div className="md:col-span-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 p-8 rounded-3xl">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <h4 className="text-2xl font-bold text-indigo-900 dark:text-indigo-300 mb-2">Wealth Projection Assumptions</h4>
            <p className="text-indigo-700/80 dark:text-indigo-400/80 text-sm leading-relaxed">
              Our forecasts assume consistent patterns and market returns. 
              Based on your 1-year outlook, maintaining your current trajectory puts you on track for a net worth of {formatCurrency(data.projections_summary.one_year_outlook.projected_net_worth)} within the next 12 months, a {projectedGrowth.toFixed(1)}% increase.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur p-4 rounded-2xl shadow-sm">
              <p className="text-[10px] text-indigo-400 font-bold uppercase">Inflation</p>
              <p className="text-lg font-black text-indigo-900 dark:text-white">
                {(data.projections_summary.key_assumptions.inflation_rate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur p-4 rounded-2xl shadow-sm">
              <p className="text-[10px] text-indigo-400 font-bold uppercase">Return Rate</p>
              <p className="text-lg font-black text-indigo-900 dark:text-white">
                {(data.projections_summary.key_assumptions.investment_return_rate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
