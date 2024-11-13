import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { Transaction, TransactionType } from '../../types/transaction';
import { format, parseISO } from 'date-fns';

interface MonthlyTrendsProps {
  transactions: Transaction[];
}

interface MonthlyData {
  date: string;
  income: number;
  expenses: number;
  savings: number;
}

export const MonthlyTrends: React.FC<MonthlyTrendsProps> = ({ transactions }) => {
  const monthlyData = transactions.reduce((acc: Record<string, MonthlyData>, transaction) => {
    const date = format(parseISO(transaction.transaction_date), 'yyyy-MM');
    
    if (!acc[date]) {
      acc[date] = {
        date,
        income: 0,
        expenses: 0,
        savings: 0
      };
    }

    if (transaction.transaction_type === TransactionType.INCOME) {
      acc[date].income += transaction.amount;
    } else {
      acc[date].expenses += Math.abs(transaction.amount);
    }
    
    acc[date].savings = acc[date].income - acc[date].expenses;
    
    return acc;
  }, {});

  const chartData = Object.values(monthlyData)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date"
            tickFormatter={(date) => format(parseISO(date), 'MMM yyyy')}
          />
          <YAxis
            tickFormatter={(value) => 
              new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'EUR',
                notation: 'compact'
              }).format(value)
            }
          />
          <Tooltip
            labelFormatter={(date) => format(parseISO(date), 'MMMM yyyy')}
            formatter={(value: number) => 
              new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'EUR'
              }).format(value)
            }
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="income" 
            stroke="#10B981" 
            strokeWidth={2}
            name="Income"
          />
          <Line 
            type="monotone" 
            dataKey="expenses" 
            stroke="#EF4444" 
            strokeWidth={2}
            name="Expenses"
          />
          <Line 
            type="monotone" 
            dataKey="savings" 
            stroke="#6366F1" 
            strokeWidth={2}
            name="Net Savings"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}; 