import React, { useState } from 'react';
import { ProjectionScenario } from '../../../types/projections';
import { useProjectionResults } from '../../../hooks/useProjectionResults';
import NetWorthChart from './charts/NetWorthChart';
import IncomeExpensesChart from './charts/IncomeExpensesChart';
import SavingsGrowthChart from './charts/SavingsGrowthChart';
import InvestmentGrowthChart from './charts/InvestmentGrowthChart';

interface ResultsVisualizationProps {
  scenarios: ProjectionScenario[];
  selectedScenarioId: number | null;
  onScenarioSelect: (scenarioId: number) => void;
  isLoading: boolean;
}

const ResultsVisualization: React.FC<ResultsVisualizationProps> = ({
  scenarios,
  selectedScenarioId,
  onScenarioSelect,
  isLoading: isLoadingScenarios,
}) => {
  const [activeTab, setActiveTab] = useState('net-worth');
  
  // Use the custom hook for managing projection results
  const {
    projectionData,
    isCalculating,
    isLoading: isLoadingResults,
    error,
    calculateResults: handleCalculateProjection,
    formatCurrency,
    getSummaryData
  } = useProjectionResults(selectedScenarioId);

  // Simple toast notification function for displaying errors
  const showToast = (message: string) => {
    if (error) {
      alert(message);
    }
  };

  // Handle scenario selection
  const handleScenarioChange = (value: string) => {
    onScenarioSelect(parseInt(value));
  };

  // Get selected scenario name
  const getSelectedScenarioName = () => {
    if (!selectedScenarioId) return 'No scenario selected';
    const scenario = scenarios.find(s => s.id === selectedScenarioId);
    return scenario ? scenario.name : 'Unknown scenario';
  };

  const summaryData = getSummaryData();

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="w-full md:w-1/2">
          <div className="relative">
            <select
              value={selectedScenarioId?.toString() || ''}
              onChange={(e) => handleScenarioChange(e.target.value)}
              disabled={isLoadingScenarios || scenarios.length === 0}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="" disabled>Select a scenario</option>
              {scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id.toString()}>
                  {scenario.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleCalculateProjection} 
          disabled={!selectedScenarioId || isCalculating}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCalculating ? 'Calculating...' : 'Calculate Projection'}
        </button>
      </div>

      {isLoadingScenarios || isLoadingResults ? (
        <div className="space-y-4 dark:bg-gray-700">
          <div className="h-[400px] w-full bg-gray-200 animate-pulse rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-[100px] w-full bg-gray-200 animate-pulse rounded-lg" />
            <div className="h-[100px] w-full bg-gray-200 animate-pulse rounded-lg" />
            <div className="h-[100px] w-full bg-gray-200 animate-pulse rounded-lg" />
          </div>
        </div>
      ) : !projectionData ? (
        <div className="border rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold">No Projection Data</h3>
            <p className="text-sm text-gray-500 mt-1">
              Select a scenario and calculate the projection to view results.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 pb-2">
                <p className="text-sm text-gray-500">1 Year Projection</p>
                <h3 className="text-lg font-semibold">{formatCurrency(summaryData.oneYear.netWorth)}</h3>
              </div>
              <div className="p-4 pt-0">
                <div className="text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Monthly Savings:</span>
                    <span>{formatCurrency(summaryData.oneYear.savings)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Investments:</span>
                    <span>{formatCurrency(summaryData.oneYear.investments)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 pb-2">
                <p className="text-sm text-gray-500">3 Year Projection</p>
                <h3 className="text-lg font-semibold">{formatCurrency(summaryData.threeYears.netWorth)}</h3>
              </div>
              <div className="p-4 pt-0">
                <div className="text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Monthly Savings:</span>
                    <span>{formatCurrency(summaryData.threeYears.savings)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Investments:</span>
                    <span>{formatCurrency(summaryData.threeYears.investments)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 pb-2">
                <p className="text-sm text-gray-500">5 Year Projection</p>
                <h3 className="text-lg font-semibold">{formatCurrency(summaryData.fiveYears.netWorth)}</h3>
              </div>
              <div className="p-4 pt-0">
                <div className="text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Monthly Savings:</span>
                    <span>{formatCurrency(summaryData.fiveYears.savings)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Investments:</span>
                    <span>{formatCurrency(summaryData.fiveYears.investments)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg shadow-sm overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold">{getSelectedScenarioName()} - Projection Results</h3>
              <p className="text-sm text-gray-500 mt-1">
                View different aspects of your financial projection
              </p>
            </div>
            <div className="p-6 pt-0">
              <div className="border-b">
                <div className="flex w-full">
                  <button 
                    onClick={() => setActiveTab('net-worth')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'net-worth' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Net Worth
                  </button>
                  <button 
                    onClick={() => setActiveTab('income-expenses')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'income-expenses' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Income vs. Expenses
                  </button>
                  <button 
                    onClick={() => setActiveTab('savings')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'savings' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Savings Growth
                  </button>
                  <button 
                    onClick={() => setActiveTab('investments')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'investments' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Investment Growth
                  </button>
                </div>
              </div>
              
              <div className="pt-4">
                {activeTab === 'net-worth' && <NetWorthChart data={projectionData} />}
                {activeTab === 'income-expenses' && <IncomeExpensesChart data={projectionData} />}
                {activeTab === 'savings' && <SavingsGrowthChart data={projectionData} />}
                {activeTab === 'investments' && <InvestmentGrowthChart data={projectionData} />}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ResultsVisualization;
