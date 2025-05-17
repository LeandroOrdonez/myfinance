import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { TransactionList } from './components/TransactionList';
import { TransactionFilters } from './components/TransactionFilters';
import { FinancialOverview } from './components/dashboard/FinancialOverview';
import { FinancialTrends } from './components/dashboard/FinancialTrends';
import { CategoryBreakdown } from './components/dashboard/CategoryBreakdown';
import { CategoryTrends } from './components/dashboard/CategoryTrends';
import { MonthlyHeatmap } from './components/dashboard/MonthlyHeatmap';
import WeekdayDistribution from './components/dashboard/WeekdayDistribution';
import FinancialHealth from './components/dashboard/FinancialHealth';
import { Loading } from './components/common/Loading';
import { CategoryTimeseriesChart } from './components/dashboard/CategoryTimeseriesChart';
import { ExpenseTypeTimeseriesChart } from './components/dashboard/ExpenseTypeTimeseriesChart';
import { useTransactions } from './hooks/useTransactions';
import { api } from './services/api';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { AuthWrapper } from './components/auth/AuthWrapper';

// Analytics Dashboard Component
const AnalyticsDashboard = () => {
  return (
    <div className="space-y-6 mt-4">
      <FinancialOverview />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryBreakdown />
        <div className="space-y-6">
          <CategoryTrends />
          <MonthlyHeatmap />
        </div>
      </div>
      <FinancialTrends />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryTimeseriesChart title="Category Trends Over Time" />
        <ExpenseTypeTimeseriesChart />
      </div>
      <WeekdayDistribution />
    </div>
  );
};

// Transactions Component
const TransactionsView = () => {
  const {
    transactions,
    loading,
    error,
    setSearchTerm,
    setCategoryFilter,
    setDateRange,
    clearFilters,
    searchTerm,
    categoryFilter,
    dateRange,
    handleCategoryUpdate,
    handleDeleteTransaction,
    currentPage,
    totalPages,
    totalTransactions,
    setCurrentPage,
    sortParams,
    setSortParams,
  } = useTransactions();

  if (loading) return <Loading />;
  if (error) return <div className="text-red-500 text-center">{error}</div>;

  return (
    <div className="mt-4">
      <TransactionFilters
        searchTerm={searchTerm}
        categoryFilter={categoryFilter}
        dateRange={dateRange}
        onSearchChange={setSearchTerm}
        onCategoryFilter={setCategoryFilter}
        onDateRangeChange={setDateRange}
        onClearFilters={clearFilters}
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
  );
};

function App() {
  const handleUploadSuccess = async () => {
    try {
      await api.initializeStatistics();
      // No need to explicitly refresh data as components will handle this with their hooks
    } catch (error) {
      console.error('Failed to initialize statistics:', error);
    }
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthWrapper>
          <BrowserRouter>
            <Routes>
            <Route 
              path="/" 
              element={
                <MainLayout onUploadSuccess={handleUploadSuccess}>
                  <Navigate to="/analytics" replace />
                </MainLayout>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <MainLayout onUploadSuccess={handleUploadSuccess}>
                  <AnalyticsDashboard />
                </MainLayout>
              } 
            />
            <Route 
              path="/transactions" 
              element={
                <MainLayout 
                  onUploadSuccess={handleUploadSuccess}
                  showUndoButton={true}
                >
                  <TransactionsView />
                </MainLayout>
              } 
            />
            <Route 
              path="/financial-health" 
              element={
                <MainLayout onUploadSuccess={handleUploadSuccess}>
                  <FinancialHealth />
                </MainLayout>
              } 
            />
            <Route path="*" element={<Navigate to="/analytics" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthWrapper>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
