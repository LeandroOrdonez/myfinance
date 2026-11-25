import React from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { FinancialSummaryResponse } from '../../types/summary';
import { DashboardCard } from './DashboardCard';
import { usePrivacyMode } from '../../contexts/PrivacyContext';

interface OverviewTabProps {
  data: FinancialSummaryResponse;
  combinedTrendData: any[];
  formatCurrency: (val: number) => string;
  formatCurrencyCompact: (val: number) => string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ data, combinedTrendData, formatCurrency, formatCurrencyCompact }) => {
  const { maskAmounts } = usePrivacyMode();
  const topCategories = data.expense_analysis.top_categories.slice(0, 5);
  const topRecommendation = data.financial_health.top_recommendations[0];

  const trendHeaderExtra = (
    <div className="flex gap-4 text-xs font-medium">
      <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
        <div className="w-2.5 h-2.5 rounded-full bg-success" /> Income
      </span>
      <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
        <div className="w-2.5 h-2.5 rounded-full bg-danger" /> Expenses
      </span>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <div className="lg:col-span-2 space-y-6">
        <DashboardCard title="Cash Flow" headerExtra={trendHeaderExtra}>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedTrendData}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: 'var(--color-text-muted)'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: 'var(--color-text-muted)'}} tickFormatter={(v) => formatCurrencyCompact(v)} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-tooltip-bg)',
                    borderColor: 'var(--color-tooltip-border)',
                    borderRadius: '16px',
                    border: '1px solid var(--color-tooltip-border)',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                  }}
                  itemStyle={{ color: 'var(--color-tooltip-text)' }}
                  labelStyle={{ color: 'var(--color-tooltip-text)', fontWeight: 'bold' }}
                  formatter={(val: number) => formatCurrency(val)}
                />
                <Area type="monotone" dataKey="income" isAnimationActive={false} stroke="#10b981" fillOpacity={1} fill="url(#colorInc)" strokeWidth={3} />
                <Area type="monotone" dataKey="expense" isAnimationActive={false} stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title="Cumulative Savings Growth">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.savings_investment.savings_growth_trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: 'var(--color-text-muted)'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: 'var(--color-text-muted)'}} tickFormatter={(v) => formatCurrencyCompact(v)} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-tooltip-bg)',
                    borderColor: 'var(--color-tooltip-border)',
                    borderRadius: '16px',
                    border: '1px solid var(--color-tooltip-border)'
                  }}
                  itemStyle={{ color: 'var(--color-tooltip-text)' }}
                  labelStyle={{ color: 'var(--color-tooltip-text)', fontWeight: 'bold' }}
                  formatter={(val: number) => formatCurrency(val)}
                />
                <Line type="linear" dataKey="cumulative_savings" isAnimationActive={false} stroke="#6366f1" strokeWidth={4} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>
      </div>

      <div className="space-y-6">
        <DashboardCard title="Top Spending Categories">
          <ol className="divide-y divide-[var(--color-border-subtle)]">
            {topCategories.map((cat, i) => (
              <li key={cat.category}>
                <Link
                  to={`/transactions?category=${encodeURIComponent(cat.category)}`}
                  className="flex items-center justify-between py-3 group"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-[var(--color-text-muted)] w-4">{i + 1}</span>
                    <span className="text-sm font-medium text-[var(--color-text-primary)] truncate capitalize group-hover:text-accent transition-colors">
                      {cat.category.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  </span>
                  <span className="text-sm font-bold text-[var(--color-text-primary)] whitespace-nowrap">
                    {formatCurrency(Math.abs(cat.amount))}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <Link
            to="/transactions"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-dark transition-colors"
          >
            View all transactions <ArrowRight size={14} />
          </Link>
        </DashboardCard>

        {topRecommendation && (
          <Link
            to="/financial-health"
            className="block bg-accent/5 border border-accent/20 p-5 rounded-2xl hover:bg-accent/10 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--color-text-primary)]">
                  Review: {maskAmounts(topRecommendation.title)}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                  {maskAmounts(topRecommendation.description)}
                </p>
              </div>
              <ArrowRight size={16} className="text-accent mt-1 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        )}

        <DashboardCard title="6-Month Outlook (Estimated)">
          <div className="space-y-4">
             <div className="flex justify-between items-center">
               <span className="text-[var(--color-text-secondary)] text-sm">Projected Net Worth</span>
               <span className="font-bold text-success">
                 {formatCurrency(data.projections_summary.six_month_outlook.projected_net_worth)}
               </span>
             </div>
             <div className="w-full bg-[var(--color-bg-tertiary)] h-2 rounded-full overflow-hidden">
               <div
                 className="bg-success h-full transition-all duration-1000"
                 style={{ width: `${Math.min(Math.max(data.income_analysis.income_stability, 0), 1) * 100}%` }}
               />
             </div>
             <p className="text-xs text-[var(--color-text-muted)]">
               Estimate based on income stability ({(data.income_analysis.income_stability * 100).toFixed(0)}%) and recent trends. Not a guarantee.
             </p>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};
