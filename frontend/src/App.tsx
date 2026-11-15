import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Home } from './components/dashboard/Home';
import { TransactionList } from './components/TransactionList';
import { TransactionFilters } from './components/TransactionFilters';
import { FinancialOverview } from './components/dashboard/FinancialOverview';
import { FinancialTrends } from './components/dashboard/FinancialTrends';
import { CategoryBreakdown } from './components/dashboard/CategoryBreakdown';
import { MonthlyHeatmap } from './components/dashboard/MonthlyHeatmap';
// import WeekdayDistribution from './components/dashboard/WeekdayDistribution';
import FinancialHealth from './components/dashboard/FinancialHealth';
import ProjectionDashboard from './components/dashboard/projections/ProjectionDashboard';
import { AnomalyDashboard } from './components/dashboard/anomalies/AnomalyDashboard';
import { AnomalyList } from './components/dashboard/anomalies/AnomalyList';
import { Budgets } from './components/dashboard/Budgets';
import { Loading } from './components/common/Loading';
import { CategoryTimeseriesChart } from './components/dashboard/CategoryTimeseriesChart';
import { ExpenseTypeTimeseriesChart } from './components/dashboard/ExpenseTypeTimeseriesChart';
import { useTransactions } from './hooks/useTransactions';
import { statisticService } from './services/statisticService';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { AuthWrapper } from './components/auth/AuthWrapper';
import { PrivacyProvider } from './contexts/PrivacyContext';
import { CashFlows } from './components/dashboard/CashFlows';
import { CategoryAverages } from './components/dashboard/CategoryAverages';
import PeriodSelector from './components/common/PeriodSelector';
import { TimePeriod, TransactionType } from './types/transaction';

const PERIOD_TO_SELECTOR: Record<TimePeriod, string> = {
  [TimePeriod.THREE_MONTHS]: '3m',
  [TimePeriod.SIX_MONTHS]: '6m',
  [TimePeriod.YEAR_TO_DATE]: 'ytd',
  [TimePeriod.ONE_YEAR]: '1y',
  [TimePeriod.TWO_YEARS]: '2y',
  [TimePeriod.ALL_TIME]: 'all',
};

const SELECTOR_TO_PERIOD: Record<string, TimePeriod> = {
  '3m': TimePeriod.THREE_MONTHS,
  '6m': TimePeriod.SIX_MONTHS,
  'ytd': TimePeriod.YEAR_TO_DATE,
  '1y': TimePeriod.ONE_YEAR,
  '2y': TimePeriod.TWO_YEARS,
  'all': TimePeriod.ALL_TIME,
};

// Analytics Dashboard Component
const AnalyticsDashboard = () => {
  const [period, setPeriod] = useState<TimePeriod>(TimePeriod.ONE_YEAR);
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);
  const [focusedType, setFocusedType] = useState<TransactionType>(TransactionType.EXPENSE);

  const handleSelectCategory = (category: string, type: TransactionType) => {
    setFocusedCategory(category);
    setFocusedType(type);
  };

  return (
    <div className="space-y-6 mt-4">
      <div className="sticky top-[76px] z-10 -mx-1 px-1 py-3 -mt-4 bg-[var(--color-bg-primary)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Trends and breakdowns across your finances
          </p>
        </div>
        <PeriodSelector
          selectedPeriod={PERIOD_TO_SELECTOR[period]}
          onChange={(p) => setPeriod(SELECTOR_TO_PERIOD[p] ?? TimePeriod.ONE_YEAR)}
          ariaLabel="Analysis period"
        />
      </div>
      <FinancialOverview />
      <CashFlows period={period} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <CategoryBreakdown onSelectCategory={handleSelectCategory} />
        <CategoryTimeseriesChart
          key={`${focusedType}-${focusedCategory ?? 'all'}`}
          title="Category Trends Over Time"
          period={period}
          defaultTransactionType={focusedType}
          focusedCategory={focusedCategory}
          onClearFocus={() => setFocusedCategory(null)}
        />
      </div>
      <FinancialTrends period={period} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <ExpenseTypeTimeseriesChart period={period} />
        <MonthlyHeatmap />
      </div>
      <CategoryAverages period={period} />
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
      // Dispatch global event to refresh components using useSummary or other shared data
      window.dispatchEvent(new CustomEvent('finance-data-updated'));
    } catch (error) {
      console.error('Failed to initialize statistics:', error);
    }
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <PrivacyProvider>
          <AuthWrapper>
            <BrowserRouter>
            <Routes>
            <Route 
              path="/" 
              element={
                <MainLayout onUploadSuccess={handleUploadSuccess}>
                  <Home />
                </MainLayout>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <MainLayout onUploadSuccess={handleUploadSuccess}>
                  <Home />
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
            <Route 
              path="/budgets" 
              element={
                <MainLayout onUploadSuccess={handleUploadSuccess}>
                  <Budgets />
                </MainLayout>
              } 
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            </BrowserRouter>
          </AuthWrapper>
        </PrivacyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
