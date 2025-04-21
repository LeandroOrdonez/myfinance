import React from 'react';
import * as Select from '@radix-ui/react-select';
import { ExpenseCategory, IncomeCategory } from '../types/transaction';

interface TransactionFiltersProps {
  searchTerm: string;
  categoryFilter: ExpenseCategory | IncomeCategory | 'all';
  dateRange: { start: string; end: string };
  onSearchChange: (search: string) => void;
  onCategoryFilter: (category: ExpenseCategory | IncomeCategory | 'all') => void;
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onClearFilters: () => void;
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  searchTerm,
  categoryFilter,
  dateRange,
  onSearchChange,
  onCategoryFilter,
  onDateRangeChange,
  onClearFilters,
}) => {
  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    const newRange = { ...dateRange, [type]: value };
    onDateRangeChange(newRange);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-gray-700/20">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 dark:placeholder-gray-400"
        />

        <Select.Root value={categoryFilter} onValueChange={(value) => onCategoryFilter(value as ExpenseCategory | IncomeCategory | 'all')}>
          <Select.Trigger className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800">
            <Select.Value placeholder="Filter by category" />
          </Select.Trigger>

          <Select.Portal>
            <Select.Content className="overflow-hidden bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700">
              <Select.Viewport className="p-2">
                <Select.Item 
                  value="all"
                  className="relative flex items-center px-8 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white rounded-md outline-none cursor-default"
                >
                  <Select.ItemText>All Categories</Select.ItemText>
                </Select.Item>

                <Select.Group>
                  <Select.Label className="px-8 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Expense Categories
                  </Select.Label>
                  {Object.values(ExpenseCategory).map((category) => (
                    <Select.Item
                      key={category}
                      value={category}
                      className="relative flex items-center px-8 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white rounded-md outline-none cursor-default"
                    >
                      <Select.ItemText>{category}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Group>

                <Select.Group>
                  <Select.Label className="px-8 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Income Categories
                  </Select.Label>
                  {Object.values(IncomeCategory).map((category) => (
                    <Select.Item
                      key={category}
                      value={category}
                      className="relative flex items-center px-8 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white rounded-md outline-none cursor-default"
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
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <span className="text-gray-500 dark:text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => handleDateRangeChange('end', e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        <button
          onClick={onClearFilters}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
};