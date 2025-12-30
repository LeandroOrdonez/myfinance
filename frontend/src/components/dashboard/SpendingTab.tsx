import React from 'react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, XAxis, YAxis, Bar, CartesianGrid 
} from 'recharts';
import { PieChart as PieIcon, BarChart3, Activity, AlertTriangle } from 'lucide-react';
import { FinancialSummaryResponse } from '../../types/summary';
import { DashboardCard } from './DashboardCard';

interface SpendingTabProps {
  data: FinancialSummaryResponse;
  formatCurrency: (val: number) => string;
  colors: string[];
}

export const SpendingTab: React.FC<SpendingTabProps> = ({ data, formatCurrency, colors }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
      <DashboardCard title="Category Breakdown" headerExtra={<PieIcon size={20} className="text-indigo-500" />}>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.transaction_summary.top_categories}
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="amount"
                nameKey="category"
              >
                {data.transaction_summary.top_categories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title="Income Sources" headerExtra={<BarChart3 size={20} className="text-indigo-500" />}>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data.income_analysis.primary_sources}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" className="dark:stroke-gray-700" />
              <XAxis type="number" hide />
              <YAxis dataKey="source" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 500, fill: '#94a3b8'}} width={120} />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px' }} />
              <Bar dataKey="amount" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title="Spending Composition" headerExtra={<Activity size={20} className="text-indigo-500" />}>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Essential', value: data.expense_analysis.essential_vs_discretionary.essential },
                  { name: 'Discretionary', value: data.expense_analysis.essential_vs_discretionary.discretionary },
                ]}
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                <Cell fill="#10b981" />
                <Cell fill="#6366f1" />
              </Pie>
              <Tooltip formatter={(val: number) => `${(val * 100).toFixed(1)}%`} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      {data.expense_analysis.outliers.length > 0 && (
        <div className="lg:col-span-2 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 p-6 rounded-3xl shadow-sm">
          <h4 className="font-bold text-lg mb-4 text-rose-900 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle size={20} /> Spending Anomalies Detected
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.expense_analysis.outliers.slice(0, 4).map((outlier, i) => (
              <div key={i} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur p-4 rounded-2xl shadow-sm border border-rose-100 dark:border-rose-900/20">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate pr-2">
                    {outlier.description}
                  </span>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                    {formatCurrency(outlier.amount)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400 italic">
                  {outlier.reason || 'Unusual transaction amount or pattern detected.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <DashboardCard title="Recent Large Transactions" className="lg:col-span-2 overflow-hidden">
         <div className="overflow-x-auto text-sm">
           <table className="w-full text-left">
             <thead>
               <tr className="text-xs text-slate-400 dark:text-gray-500 uppercase border-b border-slate-100 dark:border-gray-700">
                 <th className="pb-3 font-bold">Date</th>
                 <th className="pb-3 font-bold">Description</th>
                 <th className="pb-3 font-bold text-right">Amount</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
               {[...data.transaction_summary.recent_large_income, ...data.transaction_summary.recent_large_expenses]
                 .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                 .slice(0, 6)
                 .map((tx, i) => (
                 <tr key={i} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                   <td className="py-4 text-slate-500 dark:text-gray-400 whitespace-nowrap">{tx.date}</td>
                   <td className="py-4 font-medium max-w-md truncate pr-4 text-slate-900 dark:text-white">{tx.description}</td>
                   <td className={`py-4 text-right font-bold ${tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                     {formatCurrency(tx.amount)}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </DashboardCard>
    </div>
  );
};
