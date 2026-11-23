import React, { useState } from 'react';
import { ProjectionScenario } from '../../../types/projections';
import { useScenarioComparison } from '../../../hooks/useScenarioComparison';
import ComparisonNetWorthChart from './charts/ComparisonNetWorthChart';
import ComparisonSavingsChart from './charts/ComparisonSavingsChart';
import ComparisonInvestmentChart from './charts/ComparisonInvestmentChart';
import { ProjectionTabs } from './ProjectionTabs';
import { ForecastStatus } from './ForecastStatus';

interface ScenarioComparisonProps {
  scenarios: ProjectionScenario[];
  selectedScenarioIds: number[];
  onScenarioToggle: (scenarioId: number) => void;
  isLoading: boolean;
  refreshVersion?: number;
  onCalculated?: () => void;
}

const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({
  scenarios, selectedScenarioIds, onScenarioToggle, isLoading: isLoadingScenarios,
  refreshVersion = 0, onCalculated,
}) => {
  const [activeTab, setActiveTab] = useState('net-worth');
  
  // Use the custom hook for managing scenario comparisons
  const {
    comparisonData, isCalculating, isLoading: isLoadingComparison, error,
    calculateAll: handleCalculateAll, refreshData,
  } = useScenarioComparison(selectedScenarioIds, refreshVersion);
  const calculate = async () => {
    if (await handleCalculateAll()) onCalculated?.();
  };

  return (
    <div className="space-y-6 min-w-0" aria-busy={isLoadingComparison || isCalculating}>
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <fieldset disabled={isLoadingScenarios || isCalculating} className="min-w-0">
          <legend className="font-medium mb-2">Scenarios to compare</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {isLoadingScenarios ? <p role="status">Loading scenarios…</p> : !scenarios.length ? <p className="text-gray-600 dark:text-gray-400">No scenarios available</p> : scenarios.map(scenario => (
              <label key={scenario.id} className="flex items-center gap-2 min-h-11 text-sm cursor-pointer break-words">
                <input type="checkbox" checked={selectedScenarioIds.includes(scenario.id)} onChange={() => onScenarioToggle(scenario.id)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                {scenario.name}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="button" onClick={calculate} disabled={!selectedScenarioIds.length || isCalculating || isLoadingScenarios || isLoadingComparison} className="min-h-11 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {isCalculating ? 'Calculating selected forecasts…' : 'Recalculate selected forecasts'}
        </button>
      </div>
      {error && (
        <div role="alert" className="p-4 rounded-md bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 space-y-2">
          <p>{error}</p>
          <button type="button" onClick={refreshData} disabled={isLoadingComparison || isCalculating} className="min-h-11 underline underline-offset-4 disabled:opacity-50">Retry loading comparison</button>
        </div>
      )}
      {isLoadingComparison || isLoadingScenarios ? (
        <div role="status" className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">Loading comparison…</div>
      ) : !comparisonData?.dates.length || !selectedScenarioIds.length ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-2">
          <h2 className="text-lg font-semibold">{error ? 'Comparison unavailable' : 'Compare possible outcomes'}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Select scenarios to compare their forecasts. Select two or more to see the effect of different assumptions.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">{comparisonData.scenario_names.map(name => <ForecastStatus key={name} label={name} provenance={comparisonData.provenance?.[name]} />)}</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Adjusted comparisons require tracked inflation assumptions and a shared starting month for every forecast. Recalculate all selected scenarios to align them. Missing months are left as gaps, not estimated.</p>
          <ProjectionTabs label="Comparison metric" value={activeTab} onValueChange={setActiveTab} tabs={[
            { value: 'net-worth', label: 'Net worth', content: <ComparisonNetWorthChart data={comparisonData} /> },
            { value: 'savings', label: 'Monthly savings', content: <ComparisonSavingsChart data={comparisonData} /> },
            { value: 'investments', label: 'Monthly investments', content: <ComparisonInvestmentChart data={comparisonData} /> },
          ]} />
          <p className="text-sm text-gray-600 dark:text-gray-400">Projections are estimates, not guaranteed outcomes. Each scenario uses its own assumptions.</p>
        </>
      )}
    </div>
  );
};

export default ScenarioComparison;
