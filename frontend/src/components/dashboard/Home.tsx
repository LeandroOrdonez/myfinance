import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import {
  Wallet, Activity, Target, CheckCircle,
  TrendingUp, TrendingDown, ArrowUpRight, Calendar,
  AlertTriangle, Loader2, Sparkles
} from 'lucide-react';
import { useSummary } from '../../hooks/useSummary';
import { SummaryCard } from './SummaryCard';
import { OverviewTab } from './OverviewTab';
import { SpendingTab } from './SpendingTab';
import { HealthTab } from './HealthTab';
import { usePrivacyMode } from '../../contexts/PrivacyContext';
import { formatPrivateAmount } from '../../utils/formatPrivateAmount';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const Home: React.FC = () => {
  const { data, loading, error } = useSummary();
  const [activeTab, setActiveTab] = useState('overview');
  const { privacyMode } = usePrivacyMode();

  const combinedTrendData = useMemo(() => {
    if (!data) return [];
    const months = data.income_analysis.monthly_trends.map(t => t.month);
    return months.map(month => {
      const income = data.income_analysis.monthly_trends.find(t => t.month === month)?.amount || 0;
      const expense = Math.abs(data.expense_analysis.monthly_trends.find(t => t.month === month)?.amount || 0);
      return { month, income, expense };
    });
  }, [data]);

  const formatCurrency = (val: number) =>
    formatPrivateAmount(
      val,
      privacyMode,
      (n) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n)
    );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative">
          <Loader2 className="h-12 w-12 text-accent animate-spin" />
          <div className="absolute inset-0 h-12 w-12 bg-accent/20 blur-xl rounded-full" />
        </div>
        <p className="text-[var(--color-text-muted)] font-medium mt-6 animate-pulse">
          Generating your financial summary...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-danger" />
        </div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Something went wrong</h2>
        <p className="text-[var(--color-text-muted)]">{error || 'No data available'}</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'spending', label: 'Spending Analysis', icon: Activity },
    { id: 'health', label: 'Financial Health', icon: Sparkles },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Financial Overview
          </h1>
          <p className="text-[var(--color-text-muted)] flex items-center gap-2 mt-1 text-sm">
            <Calendar size={14} />
            Reporting Period: {data.data_period.start_date} to {data.data_period.end_date}
          </p>
        </div>

        {/* Health & Net Worth Cards */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 bg-[var(--color-surface)] p-3 rounded-2xl border border-[var(--color-border)] shadow-sm">
            <div className="px-3 py-1 border-r border-[var(--color-border)]">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider">
                Health Score
              </p>
              <div className="flex items-baseline justify-center gap-1 mt-1">
                <span className="text-2xl font-black text-accent">
                  {data.financial_health.overall_score.toFixed(0)}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">/ 100</span>
              </div>
            </div>
            <div className="px-3 py-1">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider">
                Net Worth
              </p>
              <p className="text-xl font-black text-[var(--color-text-primary)] mt-1">
                {formatCurrency(data.account_overview.net_worth)}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Emergency Fund"
          value={`${data.financial_health.metrics.emergency_fund.value.toFixed(1)} Mo`}
          subtitle={data.financial_health.metrics.emergency_fund.score >= 80 ? "Target achieved" : "Build to 6 months"}
          icon={<Wallet size={22} />}
          variant={data.financial_health.metrics.emergency_fund.score >= 80 ? 'success' : 'warning'}
          trendIcon={data.financial_health.metrics.emergency_fund.score >= 80 ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
        />

        <SummaryCard
          title="Savings Rate"
          value={`${(data.financial_health.metrics.savings_rate.value * 100).toFixed(1)}%`}
          subtitle={data.financial_health.metrics.savings_rate.score >= 60 ? "On track" : "Below 15% target"}
          icon={<Activity size={22} />}
          variant={data.financial_health.metrics.savings_rate.score >= 60 ? 'success' : 'danger'}
          trendIcon={data.financial_health.metrics.savings_rate.score >= 60 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        />

        <SummaryCard
          title="Invested Assets"
          value={formatCurrency(data.savings_investment.investment_portfolio_value)}
          subtitle="Total Portfolio"
          icon={<Target size={22} />}
          variant="info"
          trendIcon={<ArrowUpRight size={12} />}
        />

        <SummaryCard
          title="Debt-to-Income"
          value={`${(data.financial_health.metrics.debt_to_income.value * 100).toFixed(1)}%`}
          subtitle={data.financial_health.metrics.debt_to_income.score >= 80 ? "Excellent ratio" : "Manageable"}
          icon={<TrendingUp size={22} />}
          variant="success"
          trendIcon={<CheckCircle size={12} />}
        />
      </div>

      {/* Modern Tabs Navigation */}
      <div className="flex border-b border-[var(--color-border)] gap-1 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200',
                'relative whitespace-nowrap rounded-t-lg',
                isActive
                  ? 'text-accent'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
              )}
            >
              <Icon size={16} className={isActive ? 'text-accent' : ''} />
              {tab.label}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Sections */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <OverviewTab
            data={data}
            combinedTrendData={combinedTrendData}
            formatCurrency={formatCurrency}
          />
        )}

        {activeTab === 'spending' && (
          <SpendingTab
            data={data}
            formatCurrency={formatCurrency}
            colors={COLORS}
          />
        )}

        {activeTab === 'health' && (
          <HealthTab
            data={data}
            formatCurrency={formatCurrency}
          />
        )}
      </div>

      <footer className="text-center pt-8 pb-4">
        <p className="text-xs text-[var(--color-text-muted)] font-medium tracking-widest uppercase">
          Powered by MyFinance Intelligence &bull; {new Date(data.generated_at).toLocaleDateString()}
        </p>
      </footer>
    </div>
  );
};
