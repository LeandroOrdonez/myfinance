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
import { transactionService } from '../services/transactionService';
import { useActionHistory } from './useActionHistory';
import { statisticService } from '../services/statisticService';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [statistics, setStatistics] = useState<CategoryStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addAction, undoLastAction, canUndo } = useActionHistory();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | IncomeCategory | 'all'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Debounce for filters
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const PAGE_SIZE = 7;

  const [sortParams, setSortParams] = useState<SortParams>({
    field: 'date',
    direction: 'desc'
  });

  // Helper to format date to YYYY-MM-DD
const formatDate = (date: Date | string | undefined) => {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
};

const fetchData = async (filtersOverride?: {
  search?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
}) => {
  setLoading(true);
  try {
    const filters = filtersOverride || {
      search: debouncedSearch || undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      start_date: dateRange.start ? dateRange.start : undefined,
      end_date: dateRange.end ? dateRange.end : undefined,
    };
    const transactionsResponse = await transactionService.getTransactions(
      currentPage,
      PAGE_SIZE,
      sortParams,
      filters
    );
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

      const updatedTransaction = await transactionService.updateCategory(
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
      await statisticService.getStatisticsOverview();
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
      
      await transactionService.deleteTransaction(transactionId);
      
      // Update local statistics before refetching
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
      
      // Instead of just removing the transaction from local state,
      // refetch the current page data to avoid empty table rows
      await fetchData();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  // Fetch when filters or pagination change
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [currentPage, sortParams, debouncedSearch, categoryFilter, dateRange]);

  const handleUndo = async () => {
    const success = await undoLastAction();
    if (success) {
      // Refresh data after successful undo
      await fetchData();
    }
    return success;
  };

  // Handler to clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  return {
    transactions,
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
    clearFilters,
    searchTerm,
    categoryFilter,
    dateRange,
    handleCategoryUpdate,
    handleDeleteTransaction,
    handleUndo,
    canUndo,
    sortParams,
    setSortParams,
  };
};