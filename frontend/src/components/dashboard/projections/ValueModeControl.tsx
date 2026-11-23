import React from 'react';

interface ValueModeControlProps {
  showReal: boolean;
  onChange: (showReal: boolean) => void;
  available: boolean;
  inflationRate?: number | null;
  firstForecastMonth?: string;
}

export const ValueModeControl: React.FC<ValueModeControlProps> = ({ showReal, onChange, available, inflationRate, firstForecastMonth }) => (
  <div className="space-y-2">
    <div role="group" aria-label="Forecast value basis" className="flex flex-wrap gap-2">
      {[{ real: false, label: 'Future euros' }, { real: true, label: 'Inflation-adjusted euros' }].map(option => (
        <button
          key={option.label}
          type="button"
          aria-pressed={showReal === option.real}
          disabled={option.real && !available}
          onClick={() => onChange(option.real)}
          className={`min-h-11 px-3 py-2 text-sm rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 disabled:opacity-50 ${showReal === option.real ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
    <p className="text-sm text-gray-600 dark:text-gray-400">
      {showReal ? `Purchasing power at ${firstForecastMonth ? new Date(Number(firstForecastMonth.slice(0, 4)), Number(firstForecastMonth.slice(5, 7)) - 2, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'the forecast baseline'}.` : 'Future euros before inflation.'}
      {inflationRate != null && ` Inflation assumption: ${(inflationRate * 100).toFixed(1)}% per year.`}
      {!available && ' Recalculate for inflation-adjusted values.'}
    </p>
  </div>
);
