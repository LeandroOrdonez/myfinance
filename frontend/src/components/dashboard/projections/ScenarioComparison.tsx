import React, { useState } from 'react';
import { ProjectionScenario } from '../../../types/projections';
import { useScenarioComparison } from '../../../hooks/useScenarioComparison';
import ComparisonNetWorthChart from './charts/ComparisonNetWorthChart';
import ComparisonSavingsChart from './charts/ComparisonSavingsChart';
import ComparisonInvestmentChart from './charts/ComparisonInvestmentChart';

interface ScenarioComparisonProps {
  scenarios: ProjectionScenario[];
  selectedScenarioIds: number[];
  onScenarioToggle: (scenarioId: number) => void;
  isLoading: boolean;
}

const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({
  scenarios,
  selectedScenarioIds,
  onScenarioToggle,
  isLoading: isLoadingScenarios,
}) => {
  const [activeTab, setActiveTab] = useState('net-worth');
  
  // Use the custom hook for managing scenario comparisons
  const {
    comparisonData,
    isCalculating,
    isLoading: isLoadingComparison,
    error,
    calculateAll: handleCalculateAll
  } = useScenarioComparison(selectedScenarioIds);


  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Select scenarios to compare</h3>
          <div className="flex flex-wrap gap-4">
            {isLoadingScenarios ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-6 w-40 bg-gray-200 animate-pulse rounded" />
              ))
            ) : scenarios.length === 0 ? (
              <p className="text-gray-500">No scenarios available</p>
            ) : (
              scenarios.map((scenario) => (
                <div key={scenario.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`scenario-${scenario.id}`}
                    checked={selectedScenarioIds.includes(scenario.id)}
                    onChange={() => onScenarioToggle(scenario.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor={`scenario-${scenario.id}`}
                    className="text-sm font-medium"
                  >
                    {scenario.name}
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
        
        <button 
          onClick={handleCalculateAll} 
          disabled={selectedScenarioIds.length === 0 || isCalculating}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCalculating ? 'Calculating...' : 'Calculate All Selected'}
        </button>
      </div>

      {isLoadingScenarios || isLoadingComparison ? (
        <div className="h-[500px] w-full bg-gray-200 animate-pulse rounded-lg" />
      ) : !comparisonData || selectedScenarioIds.length === 0 ? (
        <div className="border rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold">No Comparison Data</h3>
            <p className="text-sm text-gray-500 mt-1">
              Select at least one scenario and calculate projections to view comparison.
            </p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold">Scenario Comparison</h3>
            <p className="text-sm text-gray-500 mt-1">
              Compare projections across different scenarios
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
                  onClick={() => setActiveTab('savings')}
                  className={`px-4 py-2 text-sm font-medium ${activeTab === 'savings' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Savings
                </button>
                <button 
                  onClick={() => setActiveTab('investments')}
                  className={`px-4 py-2 text-sm font-medium ${activeTab === 'investments' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Investments
                </button>
              </div>
            </div>
            
            <div className="pt-4">
              {activeTab === 'net-worth' && <ComparisonNetWorthChart data={comparisonData} />}
              {activeTab === 'savings' && <ComparisonSavingsChart data={comparisonData} />}
              {activeTab === 'investments' && <ComparisonInvestmentChart data={comparisonData} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioComparison;
