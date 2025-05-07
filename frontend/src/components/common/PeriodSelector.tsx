import React from 'react';

interface PeriodSelectorProps {
  selectedPeriod: string;
  onChange: (period: string) => void;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({ selectedPeriod, onChange }) => {
  const periods = [
    { id: '3m', label: '3M' },
    { id: '6m', label: '6M' },
    { id: 'ytd', label: 'YTD' },
    { id: '1y', label: '1Y' },
    { id: '2y', label: '2Y' },
    { id: 'all', label: 'All' }
  ];

  return (
    <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden" role="group">
      {periods.map(period => (
        <button
          key={period.id}
          type="button"
          className={`px-3 py-1 text-xs font-medium ${
            selectedPeriod === period.id
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          onClick={() => onChange(period.id)}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
};

export default PeriodSelector;
