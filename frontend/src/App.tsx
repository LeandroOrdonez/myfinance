import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { MainLayout } from './layouts/MainLayout';
import { TransactionList } from './components/TransactionList';
import { TransactionFilters } from './components/TransactionFilters';
import { CategoryChart } from './components/dashboard/CategoryChart';
import { MonthlyTrends } from './components/dashboard/MonthlyTrends';
import { FinancialOverview } from './components/dashboard/FinancialOverview';
import { FinancialTrends } from './components/dashboard/FinancialTrends';
import { Loading } from './components/common/Loading';
import { useTransactions } from './hooks/useTransactions';
import { api } from './services/api';

function App() {
  const {
    transactions,
    statistics,
    loading,
    error,
    refreshData,
    setSearchTerm,
    setCategoryFilter,
    setDateRange,
    handleCategoryUpdate,
    handleDeleteTransaction,
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

  if (error) {
    return (
      <MainLayout>
        <div className="text-red-500 text-center">{error}</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout onUploadSuccess={handleUploadSuccess}>
      <Tabs.Root defaultValue="analytics" className="mt-6">
        <Tabs.List className="flex border-b border-gray-200 mb-6">
          <Tabs.Trigger
            value="analytics"
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
          >
            Analytics
          </Tabs.Trigger>
          <Tabs.Trigger
            value="transactions"
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
          >
            Transactions
          </Tabs.Trigger>
        </Tabs.List>

        {loading ? (
          <Loading />
        ) : (
          <>
            <Tabs.Content value="analytics" className="space-y-6">
              <FinancialOverview />
              <FinancialTrends />
              {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium mb-4">Category Breakdown</h3>
                  <CategoryChart data={statistics} />
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium mb-4">Monthly Trends</h3>
                  <MonthlyTrends transactions={transactions} />
                </div>
              </div> */}
            </Tabs.Content>

            <Tabs.Content value="transactions">
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
            </Tabs.Content>
          </>
        )}
      </Tabs.Root>
    </MainLayout>
  );
}

export default App;
