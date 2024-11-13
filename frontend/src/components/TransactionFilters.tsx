import React from 'react';
import * as Select from '@radix-ui/react-select';
import { ExpenseCategory, IncomeCategory } from '../types/transaction';

interface TransactionFiltersProps {
  onSearchChange: (search: string) => void;
  onCategoryFilter: (category: ExpenseCategory | IncomeCategory | 'all') => void;
  onDateRangeChange: (range: { start: Date; end: Date } | null) => void;
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  onSearchChange,
  onCategoryFilter,
  onDateRangeChange,
}) => {
  const [dateRange, setDateRange] = React.useState<{
    start: string;
    end: string;
  }>({
    start: '',
    end: '',
  });

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    const newRange = { ...dateRange, [type]: value };
    setDateRange(newRange);

    if (newRange.start && newRange.end) {
      onDateRangeChange({
        start: new Date(newRange.start),
        end: new Date(newRange.end),
      });
    }
  };

  const clearFilters = () => {
    onCategoryFilter('all');
    onDateRangeChange(null);
    onSearchChange('');
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <input
          type="text"
          placeholder="Search transactions..."
          onChange={(e) => onSearchChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 flex-1"
        />

        <Select.Root onValueChange={(value) => onCategoryFilter(value as ExpenseCategory | IncomeCategory | 'all')}>
          <Select.Trigger className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <Select.Value placeholder="Filter by category" />
          </Select.Trigger>

          <Select.Portal>
            <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg">
              <Select.Viewport className="p-2">
                <Select.Item 
                  value="all"
                  className="relative flex items-center px-8 py-2 text-sm text-gray-700 hover:bg-blue-500 hover:text-white rounded-md outline-none cursor-default"
                >
                  <Select.ItemText>All Categories</Select.ItemText>
                </Select.Item>

                <Select.Group>
                  <Select.Label className="px-8 py-2 text-sm font-semibold text-gray-900">
                    Expense Categories
                  </Select.Label>
                  {Object.values(ExpenseCategory).map((category) => (
                    <Select.Item
                      key={category}
                      value={category}
                      className="relative flex items-center px-8 py-2 text-sm text-gray-700 hover:bg-blue-500 hover:text-white rounded-md outline-none cursor-default"
                    >
                      <Select.ItemText>{category}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Group>

                <Select.Group>
                  <Select.Label className="px-8 py-2 text-sm font-semibold text-gray-900">
                    Income Categories
                  </Select.Label>
                  {Object.values(IncomeCategory).map((category) => (
                    <Select.Item
                      key={category}
                      value={category}
                      className="relative flex items-center px-8 py-2 text-sm text-gray-700 hover:bg-blue-500 hover:text-white rounded-md outline-none cursor-default"
                    >
                      <Select.ItemText>{category}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => handleDateRangeChange('start', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => handleDateRangeChange('end', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          onClick={clearFilters}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}; 