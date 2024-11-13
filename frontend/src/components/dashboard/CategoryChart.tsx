import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CategoryStatistics, TransactionType } from '../../types/transaction';
import * as Tabs from '@radix-ui/react-tabs';

interface CategoryChartProps {
  data: CategoryStatistics[];
}

const EXPENSE_COLORS = [
  '#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D',
  '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2', '#FEF2F2'
];

const INCOME_COLORS = [
  '#10B981', '#059669', '#047857', '#065F46', '#064E3B',
  '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5', '#ECFDF5'
];

export const CategoryChart: React.FC<CategoryChartProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState('expenses');

  const expenseData = data
    .filter(item => item.transaction_type === TransactionType.EXPENSE)
    .map(item => ({
      name: item.category,
      value: item.total_amount
    }));

  const incomeData = data
    .filter(item => item.transaction_type === TransactionType.INCOME)
    .map(item => ({
      name: item.category,
      value: item.total_amount
    }));

  return (
    <div className="h-[500px] w-full">
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex space-x-4 mb-4">
          <Tabs.Trigger
            value="expenses"
            className={`px-4 py-2 rounded-md ${
              activeTab === 'expenses'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Expenses
          </Tabs.Trigger>
          <Tabs.Trigger
            value="income"
            className={`px-4 py-2 rounded-md ${
              activeTab === 'income'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Income
          </Tabs.Trigger>
        </Tabs.List>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={activeTab === 'expenses' ? expenseData : incomeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => 
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {(activeTab === 'expenses' ? expenseData : incomeData).map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={activeTab === 'expenses' 
                      ? EXPENSE_COLORS[index % EXPENSE_COLORS.length]
                      : INCOME_COLORS[index % INCOME_COLORS.length]
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => 
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(value)
                }
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Tabs.Root>
    </div>
  );
}; 