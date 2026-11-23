import React, { useState } from 'react';
import { ProjectionScenario } from '../../../types/projections';
import { useProjectionResults } from '../../../hooks/useProjectionResults';
import NetWorthChart from './charts/NetWorthChart';
import IncomeExpensesChart from './charts/IncomeExpensesChart';
import SavingsGrowthChart from './charts/SavingsGrowthChart';
import InvestmentGrowthChart from './charts/InvestmentGrowthChart';
import { ProjectionTabs } from './ProjectionTabs';
import { ValueModeControl } from './ValueModeControl';
import { ForecastStatus } from './ForecastStatus';
import { ForecastAssumptions } from './ForecastAssumptions';
import { ForecastSummary } from './ForecastSummary';

interface ResultsVisualizationProps {
  scenarios: ProjectionScenario[];
  selectedScenarioId: number | null;
  onScenarioSelect: (scenarioId: number) => void;
  isLoading: boolean;
  onEdit?: (scenario: ProjectionScenario) => void;
  onManage?: () => void;
  refreshVersion?: number;
  onCalculated?: (scenarioId: number) => void;
}

const ResultsVisualization: React.FC<ResultsVisualizationProps> = ({
  scenarios, selectedScenarioId, onScenarioSelect, isLoading: isLoadingScenarios,
  onEdit, onManage, refreshVersion = 0, onCalculated,
}) => {
  const [activeTab, setActiveTab] = useState('net-worth');
  const [showReal, setShowReal] = useState(false);

  // Use the custom hook for managing projection results
  const {
    projectionData, isCalculating, isLoading: isLoadingResults, error,
    calculateResults: handleCalculateProjection, formatCurrency, getSummaryData, refreshData,
  } = useProjectionResults(selectedScenarioId, showReal, refreshVersion);

  // Simple toast notification function for displaying errors
  const showToast = () => error && (
    <div role="alert" className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 text-red-800 dark:text-red-200 space-y-2">
      <p>{error}</p>
      {projectionData && <p className="text-sm">Showing previous results, not a refreshed forecast.</p>}
      <button type="button" onClick={refreshData} disabled={isLoadingResults || isCalculating} className="min-h-11 underline underline-offset-4 font-medium disabled:opacity-50">Retry loading forecast</button>
    </div>
  );

  // Handle scenario selection
  const handleScenarioChange = (value: string) => { onScenarioSelect(Number(value)); };

  // Get selected scenario name
  const getSelectedScenarioName = () => scenarios.find(s => s.id === selectedScenarioId)?.name ?? 'No scenario selected';
  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);
  const hasRealData = Boolean(projectionData?.dates.length && [
    projectionData.real_projected_net_worth, projectionData.real_projected_income,
    projectionData.real_projected_expenses, projectionData.real_projected_savings,
    projectionData.real_projected_investments,
  ].every(series => series?.length === projectionData.dates.length));
  const useReal = showReal && hasRealData;
  const calculate = async () => {
    if (selectedScenarioId && await handleCalculateProjection()) onCalculated?.(selectedScenarioId);
  };

  return (
    <div className="space-y-3 min-w-0" aria-busy={isLoadingResults || isCalculating}>
      <div className="grid grid-cols-2 md:flex md:items-end gap-3">
        <div className="col-span-2 flex-1 min-w-0">
          <label htmlFor="forecast-scenario" className="block text-sm font-medium mb-2">Scenario</label>
          <select id="forecast-scenario" value={selectedScenarioId ?? ''} onChange={e => handleScenarioChange(e.target.value)} disabled={isLoadingScenarios || isCalculating || !scenarios.length} className="w-full min-h-11 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 focus:ring-2 focus:ring-blue-500">
            <option value="" disabled>Select a scenario</option>
            {scenarios.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
          </select>
        </div>
        {selectedScenario && onEdit && <button type="button" onClick={() => onEdit(selectedScenario)} disabled={isCalculating} className="min-h-11 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">Edit assumptions</button>}
        <button type="button" onClick={calculate} disabled={!selectedScenarioId || isCalculating || isLoadingScenarios || isLoadingResults} className="min-h-11 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {isCalculating ? 'Calculating…' : 'Calculate forecast'}
        </button>
      </div>
      {showToast()}
      {(isLoadingScenarios || isLoadingResults) ? (
        <div role="status" className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300">Loading forecast…</div>
      ) : !projectionData?.dates.length ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-2">
          <h2 className="text-lg font-semibold">{error ? 'Forecast unavailable' : 'Your forecast starts here'}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{scenarios.length ? 'Calculate a forecast using this scenario’s assumptions to see your possible financial trajectory.' : 'Create a scenario to start exploring your financial future.'}</p>
          {!scenarios.length && onManage && <button type="button" onClick={onManage} className="min-h-11 text-blue-700 dark:text-blue-300 underline underline-offset-4">Manage scenarios</button>}
        </div>
      ) : (
        <>
          <ForecastStatus provenance={projectionData.provenance} />
          <ValueModeControl showReal={useReal} onChange={setShowReal} available={hasRealData} inflationRate={projectionData.inflation_rate} firstForecastMonth={projectionData.dates[0]} />
          <ForecastSummary summary={getSummaryData(useReal)} formatCurrency={formatCurrency} />
          <section aria-label={`${getSelectedScenarioName()} forecast`} className="min-w-0">
            <ProjectionTabs label="Forecast metric" value={activeTab} onValueChange={setActiveTab} tabs={[
              { value: 'net-worth', label: 'Net worth', content: <NetWorthChart data={projectionData} showReal={useReal} /> },
              { value: 'income-expenses', label: 'Income & expenses', content: <IncomeExpensesChart data={projectionData} showReal={useReal} /> },
              { value: 'savings', label: 'Monthly savings', content: <SavingsGrowthChart data={projectionData} showReal={useReal} /> },
              { value: 'investments', label: 'Monthly investments', content: <InvestmentGrowthChart data={projectionData} showReal={useReal} /> },
            ]} />
          </section>
          {selectedScenario && <ForecastAssumptions scenario={selectedScenario} provenance={projectionData.provenance} formatCurrency={formatCurrency} />}
          <p className="text-sm text-gray-600 dark:text-gray-400">Projections are estimates based on your records and assumptions, not guaranteed outcomes. Investment returns and future spending can differ.</p>
        </>
      )}
    </div>
  );
};

export default ResultsVisualization;
