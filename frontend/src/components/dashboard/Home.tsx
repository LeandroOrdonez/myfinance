import React, { useState, useMemo } from 'react';
import { 
  Wallet, Activity, Target, CheckCircle, 
  TrendingUp, TrendingDown, ArrowUpRight, Calendar,
  AlertTriangle, Loader2
} from 'lucide-react';
import { useSummary } from '../../hooks/useSummary';
import { SummaryCard } from './SummaryCard';
import { OverviewTab } from './OverviewTab';
import { SpendingTab } from './SpendingTab';
import { HealthTab } from './HealthTab';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const Home: React.FC = () => {
  const { data, loading, error } = useSummary();
  const [activeTab, setActiveTab] = useState('overview');

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
    new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(val);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-gray-400 font-medium">Generating your financial summary...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h2>
        <p className="text-slate-500 dark:text-gray-400">{error || 'No data available'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Wealth Dashboard</h1>
          <p className="text-slate-500 dark:text-gray-400 flex items-center gap-2 mt-1 text-sm">
            <Calendar size={16} /> Reporting Period: {data.data_period.start_date} to {data.data_period.end_date}
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700">
          <div className="px-4 py-2 border-r border-slate-100 dark:border-gray-700 text-center">
            <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-bold tracking-wider text-center">Health Score</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{data.financial_health.overall_score.toFixed(1)}</span>
              <span className="text-[10px] text-slate-400 dark:text-gray-500">/ 100</span>
            </div>
          </div>
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-bold tracking-wider text-center">Net Worth</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{formatCurrency(data.account_overview.net_worth)}</p>
          </div>
        </div>
      </header>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Emergency Fund"
          value={`${data.financial_health.metrics.emergency_fund.value.toFixed(1)} Mo`}
          subtitle={data.financial_health.metrics.emergency_fund.score >= 80 ? "Target achieved" : "Build to 6 months"}
          icon={<Wallet size={24} />}
          iconBg="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          subtitleColor={data.financial_health.metrics.emergency_fund.score >= 80 ? "text-emerald-600" : "text-amber-600"}
          trendIcon={data.financial_health.metrics.emergency_fund.score >= 80 ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
        />

        <SummaryCard 
          title="Savings Rate"
          value={`${(data.financial_health.metrics.savings_rate.value * 100).toFixed(1)}%`}
          subtitle={data.financial_health.metrics.savings_rate.score >= 60 ? "On track" : "Below 15% target"}
          icon={<Activity size={24} />}
          iconBg="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
          subtitleColor={data.financial_health.metrics.savings_rate.score >= 60 ? "text-emerald-600" : "text-rose-600"}
          trendIcon={data.financial_health.metrics.savings_rate.score >= 60 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        />

        <SummaryCard 
          title="Invested Assets"
          value={formatCurrency(data.savings_investment.investment_portfolio_value)}
          subtitle="Total Portfolio"
          icon={<Target size={24} />}
          iconBg="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
          subtitleColor="text-indigo-600 dark:text-indigo-400"
          trendIcon={<ArrowUpRight size={12} />}
        />

        <SummaryCard 
          title="Debt-to-Income"
          value={`${(data.financial_health.metrics.debt_to_income.value * 100).toFixed(1)}%`}
          subtitle={data.financial_health.metrics.debt_to_income.score >= 80 ? "Excellent ratio" : "Manageable"}
          icon={<TrendingUp size={24} />}
          iconBg="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          subtitleColor="text-emerald-600 dark:text-emerald-400"
          trendIcon={<CheckCircle size={12} />}
        />
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-gray-700 gap-8 overflow-x-auto no-scrollbar">
        {['overview', 'spending', 'health'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-semibold capitalize transition-all relative whitespace-nowrap ${
              activeTab === tab ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />}
          </button>
        ))}
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

      <footer className="text-center pt-8">
        <p className="text-xs text-slate-400 dark:text-gray-500 font-medium tracking-widest uppercase">
          Data Analysis Generated by MyFinance Intelligence &bull; {new Date(data.generated_at).toLocaleDateString()}
        </p>
      </footer>
    </div>
  );
};
