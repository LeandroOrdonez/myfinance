import React, { useState } from 'react';

interface Metric { netWorth: number | undefined; savings: number | undefined; investments: number | undefined }
interface Props {
  summary: { oneYear: Metric; threeYears: Metric; fiveYears: Metric };
  formatCurrency: (value: number | undefined) => string;
}

export const ForecastSummary: React.FC<Props> = ({ summary, formatCurrency }) => {
  const [horizon, setHorizon] = useState<'oneYear' | 'threeYears' | 'fiveYears'>('oneYear');
  const options = [{ key: 'oneYear', label: '1 year' }, { key: 'threeYears', label: '3 years' }, { key: 'fiveYears', label: '5 years' }] as const;
  const label = options.find(option => option.key === horizon)!.label;
  const values = summary[horizon];
  return (
    <section aria-label="Forecast summary" className="space-y-3">
      <div role="group" aria-label="Forecast horizon" className="flex flex-wrap gap-2">
        {options.map(option => <button key={option.key} type="button" aria-pressed={horizon === option.key} onClick={() => setHorizon(option.key)} className={`min-h-11 px-4 py-2 text-sm rounded-md border focus-visible:ring-2 focus-visible:ring-blue-500 ${horizon === option.key ? 'border-blue-600 text-blue-700 dark:text-blue-300 dark:border-blue-400' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>{option.label}</button>)}
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><dt className="text-sm text-gray-600 dark:text-gray-400">Net worth in {label}</dt><dd className="text-2xl font-semibold tabular-nums break-words">{formatCurrency(values.netWorth)}</dd></div>
        <div className="hidden sm:block"><dt className="text-sm text-gray-600 dark:text-gray-400">Monthly savings at {label}</dt><dd className="font-medium tabular-nums break-words">{formatCurrency(values.savings)}</dd></div>
        <div className="hidden sm:block"><dt className="text-sm text-gray-600 dark:text-gray-400">Monthly investments at {label}</dt><dd className="font-medium tabular-nums break-words">{formatCurrency(values.investments)}</dd></div>
      </dl>
      <details className="sm:hidden text-sm">
        <summary className="min-h-11 py-2 cursor-pointer">Monthly detail at {label}</summary>
        <dl className="space-y-2"><div><dt>Monthly savings</dt><dd className="tabular-nums">{formatCurrency(values.savings)}</dd></div><div><dt>Monthly investments</dt><dd className="tabular-nums">{formatCurrency(values.investments)}</dd></div></dl>
      </details>
    </section>
  );
};
