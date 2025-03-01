import React, { useState } from 'react';
import { MainLayout } from './layouts/MainLayout';
import { TransactionList } from './components/TransactionList';
import { TransactionFilters } from './components/TransactionFilters';
import { FinancialOverview } from './components/dashboard/FinancialOverview';
import { FinancialTrends } from './components/dashboard/FinancialTrends';
import { Loading } from './components/common/Loading';
import { useTransactions } from './hooks/useTransactions';
import { api } from './services/api';

function App() {
  // State to manage the active view
  const [activeView, setActiveView] = useState('analytics');

  const {
    transactions,
    loading,
    error,
    refreshData,
    setSearchTerm,
    setCategoryFilter,
    setDateRange,
    handleCategoryUpdate,
    handleDeleteTransaction,
    handleUndo,
    canUndo,
    currentPage,
    totalPages,
    totalTransactions,
    setCurrentPage,
    sortParams,
    setSortParams,
  } = useTransactions();

  const handleUploadSuccess = async () => {
    try {
      await api.initializeStatistics();
      refreshData();
    } catch (error) {
      console.error('Failed to initialize statistics:', error);
    }
  };

  const handleNavigate = (view: string) => {
    setActiveView(view);
  };

  if (error) {
    return (
      <MainLayout
        activeView={activeView}
        onNavigate={handleNavigate}
      >
        <div className="text-red-500 text-center">{error}</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      onUploadSuccess={handleUploadSuccess}
      onUndo={handleUndo}
      canUndo={canUndo}
      activeView={activeView}
      onNavigate={handleNavigate}
    >
      {loading ? (
        <Loading />
      ) : (
        <>
          {activeView === 'analytics' && (
            <div className="space-y-6 mt-4">
              <FinancialOverview />
              <FinancialTrends />
            </div>
          )}

          {activeView === 'transactions' && (
            <div className="mt-4">
              <TransactionFilters
                onSearchChange={setSearchTerm}
                onCategoryFilter={setCategoryFilter}
                onDateRangeChange={setDateRange}
              />
              <div className="mt-6">
                <TransactionList 
                  transactions={transactions}
                  totalTransactions={totalTransactions}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  sortParams={sortParams}
                  onSortChange={setSortParams}
                  onTransactionUpdate={handleCategoryUpdate}
                  onTransactionDelete={handleDeleteTransaction}
                />
              </div>
            </div>
          )}
        </>
      )}
    </MainLayout>
  );
}

export default App;
