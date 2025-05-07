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
    <div className="inline-flex rounded-md shadow-sm" role="group">
      {periods.map(period => (
        <button
          key={period.id}
          type="button"
          className={`px-3 py-1 text-xs font-medium ${
            selectedPeriod === period.id
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          } ${
            period.id === periods[0].id
              ? 'rounded-l-md'
              : period.id === periods[periods.length - 1].id
                ? 'rounded-r-md'
                : ''
          } border border-gray-300`}
          onClick={() => onChange(period.id)}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
};

export default PeriodSelector;
