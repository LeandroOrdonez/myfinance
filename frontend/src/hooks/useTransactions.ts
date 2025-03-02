import { useState, useEffect, useMemo } from 'react';
import { 
  Transaction, 
  ExpenseCategory, 
  IncomeCategory, 
  TransactionType,
  CategoryStatistics,
  SortParams,
  ActionType,
} from '../types/transaction';
import { api } from '../services/api';
import { isWithinInterval } from 'date-fns';
import { useActionHistory } from './useActionHistory';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [statistics, setStatistics] = useState<CategoryStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addAction, undoLastAction, canUndo } = useActionHistory();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | IncomeCategory | 'all'>('all');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const PAGE_SIZE = 7;

  const [sortParams, setSortParams] = useState<SortParams>({
    field: 'date',
    direction: 'desc'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const transactionsResponse = await api.getTransactions(currentPage, PAGE_SIZE, sortParams);
      
      setTransactions(transactionsResponse.items);
      setTotalTransactions(transactionsResponse.total);
      setTotalPages(transactionsResponse.total_pages);
      setError(null);
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryUpdate = async (
    transactionId: number,
    category: ExpenseCategory | IncomeCategory,
    transactionType: TransactionType
  ) => {
    try {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) return;

      const oldCategory = transactionType === TransactionType.EXPENSE 
        ? transaction.expense_category 
        : transaction.income_category;

      // Record this action for potential undo
      addAction({
        type: ActionType.UPDATE_CATEGORY,
        transactionId,
        oldCategory,
        newCategory: category,
        transactionType
      });

      const updatedTransaction = await api.updateCategory(
        transactionId, 
        category, 
        transactionType
      );

      // Update local transactions
      setTransactions(prevTransactions =>
        prevTransactions.map(t =>
          t.id === transactionId ? updatedTransaction : t
        )
      );
      
      // Refresh financial statistics
      await api.getStatisticsOverview();
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    try {
      // Find transaction before deleting
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) return;
      
      // Record this action for potential undo
      addAction({
        type: ActionType.DELETE_TRANSACTION,
        transaction: transaction
      });
      
      await api.deleteTransaction(transactionId);
      
      // Remove from local transactions
      setTransactions(prev => prev.filter(t => t.id !== transactionId));

      // Update local statistics
      const category = transaction.transaction_type === TransactionType.EXPENSE 
        ? transaction.expense_category 
        : transaction.income_category;

      setStatistics(prevStats => {
        const newStats = [...prevStats];
        const amount = Math.abs(transaction.amount);

        const statIndex = newStats.findIndex(
          stat => stat.category === category && 
                 stat.transaction_type === transaction.transaction_type
        );

        if (statIndex !== -1) {
          const stat = newStats[statIndex];
          if (stat.transaction_count === 1) {
            // Remove the category if this was the last transaction
            newStats.splice(statIndex, 1);
          } else {
            // Update the category stats
            newStats[statIndex] = {
              ...stat,
              total_amount: stat.total_amount - amount,
              transaction_count: stat.transaction_count - 1
            };
          }
        }

        return newStats;
      });
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, sortParams]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      const matchesCategory = categoryFilter === 'all' || (
        transaction.transaction_type === TransactionType.EXPENSE
          ? transaction.expense_category === categoryFilter
          : transaction.income_category === categoryFilter
      );

      // Date range filter
      const matchesDateRange = !dateRange || 
        isWithinInterval(new Date(transaction.transaction_date), {
          start: dateRange.start,
          end: dateRange.end,
        });

      return matchesSearch && matchesCategory && matchesDateRange;
    });
  }, [transactions, searchTerm, categoryFilter, dateRange]);

  const handleUndo = async () => {
    const success = await undoLastAction();
    if (success) {
      // Refresh data after successful undo
      await fetchData();
    }
    return success;
  };

  return {
    transactions: filteredTransactions,
    statistics,
    loading,
    error,
    currentPage,
    totalPages,
    totalTransactions,
    setCurrentPage,
    refreshData: fetchData,
    setSearchTerm,
    setCategoryFilter,
    setDateRange,
    handleCategoryUpdate,
    handleDeleteTransaction,
    handleUndo,
    canUndo,
    sortParams,
    setSortParams,
  };
};