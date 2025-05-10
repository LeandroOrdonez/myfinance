import React, { useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { Transaction, TransactionType, ExpenseCategory, IncomeCategory, SortParams } from '../types/transaction';
import { format } from 'date-fns';
import { TrashIcon } from '@heroicons/react/24/outline';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Pagination } from './common/Pagination';

interface TransactionListProps {
  transactions: Transaction[];
  totalTransactions: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortParams: SortParams;
  onSortChange: (params: SortParams) => void;
  onTransactionUpdate: (
    transactionId: number,
    category: ExpenseCategory | IncomeCategory,
    transactionType: TransactionType
  ) => Promise<void>;
  onTransactionDelete: (transactionId: number) => Promise<void>;
}

type SortField = 'date' | 'description' | 'amount' | 'type';
type SortDirection = 'asc' | 'desc';

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  totalTransactions,
  currentPage,
  totalPages,
  onPageChange,
  sortParams,
  onSortChange,
  onTransactionUpdate,
  onTransactionDelete,
}) => {
  const handleSort = (field: SortField) => {
    if (field === sortParams.field) {
      onSortChange({
        field,
        direction: sortParams.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      onSortChange({
        field,
        direction: 'asc'
      });
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (field !== sortParams.field) return null;
    return sortParams.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  const TableHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        <SortIcon field={field} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <TableHeader field="date" label="Date" />
              <TableHeader field="description" label="Description" />
              <TableHeader field="amount" label="Amount" />
              <TableHeader field="type" label="Type" />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white text-xs dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200">
                  {format(new Date(transaction.transaction_date), 'dd/MM/yyyy')}
                </td>
                <td className="px-6 py-4 text-gray-900 dark:text-gray-200">
                  {transaction.description}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap ${
                  transaction.transaction_type === TransactionType.INCOME 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: transaction.currency,
                  }).format(Math.abs(transaction.amount))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200">
                  {transaction.transaction_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Select.Root
                    value={transaction.transaction_type === TransactionType.EXPENSE 
                      ? transaction.expense_category 
                      : transaction.income_category}
                    onValueChange={(value) =>
                      onTransactionUpdate(
                        transaction.id,
                        value as (ExpenseCategory | IncomeCategory),
                        transaction.transaction_type
                      )
                    }
                  >
                    <Select.Trigger className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-xs leading-4 font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800">
                      <Select.Value placeholder="Select category" />
                    </Select.Trigger>

                    <Select.Portal>
                      <Select.Content className="overflow-hidden bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700">
                        <Select.Viewport className="p-1">
                          {transaction.transaction_type === TransactionType.EXPENSE
                            ? Object.values(ExpenseCategory).map((category) => (
                                <Select.Item
                                  key={category}
                                  value={category}
                                  className="relative flex items-center px-8 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white rounded-md outline-none cursor-default"
                                >
                                  <Select.ItemText>{category}</Select.ItemText>
                                </Select.Item>
                              ))
                            : Object.values(IncomeCategory).map((category) => (
                                <Select.Item
                                  key={category}
                                  value={category}
                                  className="relative flex items-center px-8 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white rounded-md outline-none cursor-default"
                                >
                                  <Select.ItemText>{category}</Select.ItemText>
                                </Select.Item>
                              ))
                          }
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => onTransactionDelete(transaction.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}; 