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
// import WeekdayDistribution from './components/dashboard/WeekdayDistribution';
import FinancialHealth from './components/dashboard/FinancialHealth';
import ProjectionDashboard from './components/dashboard/projections/ProjectionDashboard';
import { AnomalyDashboard } from './components/dashboard/anomalies/AnomalyDashboard';
import { AnomalyList } from './components/dashboard/anomalies/AnomalyList';
import { Loading } from './components/common/Loading';
import { CategoryTimeseriesChart } from './components/dashboard/CategoryTimeseriesChart';
import { ExpenseTypeTimeseriesChart } from './components/dashboard/ExpenseTypeTimeseriesChart';
import { useTransactions } from './hooks/useTransactions';
import { statisticService } from './services/statisticService';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { AuthWrapper } from './components/auth/AuthWrapper';
import { CategoryAverages } from './components/dashboard/CategoryAverages';
import { MoneyFlows } from './components/dashboard/MoneyFlows';

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryAverages />
        <MoneyFlows />
      </div>
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

  if (loading) return <Loading variant="progress" size="large" />;
  if (error) return (
    <div className="mt-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white text-xs dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            <tr>
              <td colSpan={7} className="text-center py-4">
                <div className="text-gray-500 dark:text-gray-400">{error}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

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
      await statisticService.initializeStatistics();
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
            <Route 
              path="/projections" 
              element={
                <MainLayout onUploadSuccess={handleUploadSuccess}>
                  <ProjectionDashboard />
                </MainLayout>
              } 
            />
            <Route 
              path="/anomalies" 
              element={
                <MainLayout onUploadSuccess={handleUploadSuccess}>
                  <div className="space-y-6">
                    <AnomalyDashboard />
                    <AnomalyList />
                  </div>
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
