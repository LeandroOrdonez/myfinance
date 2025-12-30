import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import { Info } from 'lucide-react';
import { FinancialSummaryResponse } from '../../types/summary';
import { DashboardCard } from './DashboardCard';

interface OverviewTabProps {
  data: FinancialSummaryResponse;
  combinedTrendData: any[];
  formatCurrency: (val: number) => string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ data, combinedTrendData, formatCurrency }) => {
  const trendHeaderExtra = (
    <div className="flex gap-4 text-xs font-medium">
      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Income
      </span>
      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Expenses
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-gray-700" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(v) => `€${v/1000}k`} />
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-gray-700" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(v) => `€${Math.round(v/1000)}k`} />
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
        <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-xl">
          <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Info size={20} className="text-indigo-300" /> Smart Insights
          </h4>
          <div className="space-y-4">
            {data.financial_health.top_recommendations.map((rec, i) => (
              <div key={i} className="bg-indigo-800/50 p-4 rounded-2xl border border-indigo-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-bold">{rec.title}</span>
                  <span className="text-[9px] uppercase font-black bg-indigo-500 px-2 py-0.5 rounded">Priority {rec.priority}</span>
                </div>
                <p className="text-[12px] text-indigo-200 leading-relaxed">{rec.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-indigo-800">
            <p className="text-[12px] text-indigo-300 italic">"{data.narrative_summary}"</p>
          </div>
        </div>

        <DashboardCard title="6-Month Outlook">
          <div className="space-y-4">
             <div className="flex justify-between items-center">
               <span className="text-slate-500 dark:text-gray-400 text-sm">Projected Net Worth</span>
               <span className="font-bold text-emerald-600 dark:text-emerald-400">
                 {formatCurrency(data.projections_summary.six_month_outlook.projected_net_worth)}
               </span>
             </div>
             <div className="w-full bg-slate-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
               <div 
                 className="bg-emerald-500 h-full transition-all duration-1000" 
                 style={{ width: `${data.income_analysis.income_stability * 100}%` }} 
               />
             </div>
             <p className="text-xs text-slate-400 dark:text-gray-500">
               Estimated growth based on current income stability ({(data.income_analysis.income_stability * 100).toFixed(0)}%) and YoY growth trends.
             </p>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};
