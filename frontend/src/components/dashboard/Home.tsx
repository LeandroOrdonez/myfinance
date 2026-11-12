import React, { useState, useMemo, useRef } from 'react';
import clsx from 'clsx';
import {
  Activity, CheckCircle, RefreshCw, Upload,
  TrendingUp, TrendingDown, Calendar,
  AlertTriangle, Loader2, Sparkles, ArrowDownCircle, ArrowUpCircle, Scale
} from 'lucide-react';
import { useSummary } from '../../hooks/useSummary';
import { SummaryCard } from './SummaryCard';
import { OverviewTab } from './OverviewTab';
import { SpendingTab } from './SpendingTab';
import { HealthTab } from './HealthTab';
import { usePrivacyMode } from '../../contexts/PrivacyContext';
import { formatPrivateAmount } from '../../utils/formatPrivateAmount';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const tabs = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'spending', label: 'Spending Analysis', icon: Activity },
  { id: 'health', label: 'Financial Health', icon: Sparkles },
];

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
  switch (status.toLowerCase()) {
    case 'excellent':
    case 'good':
      return 'success';
    case 'average':
      return 'warning';
    case 'poor':
      return 'warning';
    case 'critical':
      return 'danger';
    default:
      return 'info';
  }
};

export const Home: React.FC = () => {
  const { data, loading, error, refreshSummary } = useSummary();
  const [activeTab, setActiveTab] = useState('overview');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
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

  const periodTotals = useMemo(() => {
    if (!data) return { income: 0, spent: 0, net: 0 };
    const income = data.income_analysis.monthly_trends.reduce((sum, t) => sum + t.amount, 0);
    const spent = data.expense_analysis.monthly_trends.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { income, spent, net: income - spent };
  }, [data]);

  const formatCurrency = (val: number) =>
    formatPrivateAmount(
      val,
      privacyMode,
      (n) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n)
    );

  const formatCurrencyCompact = (val: number) =>
    formatPrivateAmount(
      val,
      privacyMode,
      (n) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(n)
    );

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    if (e.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') nextIndex = 0;
    if (e.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex !== null) {
      e.preventDefault();
      setActiveTab(tabs[nextIndex].id);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  // Full-screen loading only when there is no prior data to keep showing
  if (loading && !data) {
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-danger" />
        </div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Could not load your summary</h2>
        <p className="text-[var(--color-text-muted)] mb-6">{error}</p>
        <button
          onClick={refreshSummary}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  if (data.transaction_summary.total_count === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
          <Upload className="h-8 w-8 text-accent" />
        </div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">No transactions yet</h1>
        <p className="text-[var(--color-text-muted)] mb-2">
          Import a bank statement to see where your money goes. MyFinance supports
          CSV exports from ING and KBC.
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          Use the <span className="font-semibold text-[var(--color-text-primary)]">Upload</span> button
          in the header to upload your first statement.
        </p>
      </div>
    );
  }

  const savingsMetric = data.financial_health.metrics.savings_rate;

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
      </header>

      {/* Period cash flow — where did my money go */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Spent Last 12 Months"
          value={formatCurrency(periodTotals.spent)}
          subtitle={`${data.transaction_summary.total_count} transactions`}
          icon={<ArrowDownCircle size={22} />}
          variant="danger"
          trendIcon={<TrendingDown size={12} />}
        />

        <SummaryCard
          title="Income Last 12 Months"
          value={formatCurrency(periodTotals.income)}
          subtitle={`${data.income_analysis.primary_sources.length} source${data.income_analysis.primary_sources.length === 1 ? '' : 's'}`}
          icon={<ArrowUpCircle size={22} />}
          variant="success"
          trendIcon={<TrendingUp size={12} />}
        />

        <SummaryCard
          title="Net Cash Flow"
          value={formatCurrency(periodTotals.net)}
          subtitle={periodTotals.net >= 0 ? 'Income exceeded spending' : 'Spending exceeded income'}
          icon={<Scale size={22} />}
          variant={periodTotals.net >= 0 ? 'success' : 'danger'}
          trendIcon={periodTotals.net >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        />

        <SummaryCard
          title="Savings Rate"
          value={`${(savingsMetric.value * 100).toFixed(1)}%`}
          subtitle={savingsMetric.status}
          icon={<Activity size={22} />}
          variant={statusVariant(savingsMetric.status)}
          trendIcon={statusVariant(savingsMetric.status) === 'success' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
        />
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Dashboard sections"
        className="flex border-b border-[var(--color-border)] gap-1 overflow-x-auto"
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[index] = el; }}
              role="tab"
              id={`dashboard-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`dashboard-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
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
          <div role="tabpanel" id="dashboard-panel-overview" aria-labelledby="dashboard-tab-overview">
            <OverviewTab
              data={data}
              combinedTrendData={combinedTrendData}
              formatCurrency={formatCurrency}
              formatCurrencyCompact={formatCurrencyCompact}
            />
          </div>
        )}

        {activeTab === 'spending' && (
          <div role="tabpanel" id="dashboard-panel-spending" aria-labelledby="dashboard-tab-spending">
            <SpendingTab
              data={data}
              formatCurrency={formatCurrency}
              colors={COLORS}
            />
          </div>
        )}

        {activeTab === 'health' && (
          <div role="tabpanel" id="dashboard-panel-health" aria-labelledby="dashboard-tab-health">
            <HealthTab
              data={data}
              formatCurrency={formatCurrency}
            />
          </div>
        )}
      </div>

      <footer className="text-center pt-8 pb-4">
        <p className="text-xs text-[var(--color-text-muted)] font-medium tracking-widest uppercase">
          Summary generated {new Date(data.generated_at).toLocaleDateString('en-IE')}
        </p>
      </footer>
    </div>
  );
};
