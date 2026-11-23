import React, { useState, useEffect, useCallback } from 'react';
import ScenarioManager from './ScenarioManager';
import ResultsVisualization from './ResultsVisualization';
import ScenarioComparison from './ScenarioComparison';
import { useProjectionScenarios } from '../../../hooks/useProjectionScenarios';
import { ProjectionTabs } from './ProjectionTabs';

const ProjectionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('results');
  const [editScenarioId, setEditScenarioId] = useState<number | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  
  // Use the custom hook for managing projection scenarios
  const {
    scenarios,
    selectedScenarioId,
    comparisonScenarioIds,
    isLoading,
    error,
    handleScenarioSelect,
    handleComparisonToggle,
    refreshScenarios
  } = useProjectionScenarios();
  
  // Handle scenario refresh after create/update/delete
  const handleScenariosRefresh = useCallback(() => {
    setRefreshVersion(version => version + 1);
    refreshScenarios();
  }, [refreshScenarios]);
  useEffect(() => {
    window.addEventListener('finance-data-updated', handleScenariosRefresh);
    return () => window.removeEventListener('finance-data-updated', handleScenariosRefresh);
  }, [handleScenariosRefresh]);
  const handleCalculated = () => {
    handleScenariosRefresh();
  };

  return (
    <div className="space-y-6 min-w-0">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Projections</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Explore where your finances could be heading, and how your assumptions change the outlook.</p>
      </header>
      {error && (
        <div role="alert" className="p-4 rounded-md bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200">
          <p>Could not load projection scenarios. Your saved scenarios have not been removed.</p>
          <button type="button" onClick={refreshScenarios} disabled={isLoading} className="min-h-11 underline underline-offset-4 disabled:opacity-50">Retry loading scenarios</button>
        </div>
      )}
      <ProjectionTabs label="Projections" value={activeTab} onValueChange={setActiveTab} tabs={[
        { value: 'results', label: 'Forecast', keepMounted: true, content: (
          <ResultsVisualization
            scenarios={scenarios}
            selectedScenarioId={selectedScenarioId}
            onScenarioSelect={handleScenarioSelect}
            isLoading={isLoading}
            refreshVersion={refreshVersion}
            onCalculated={handleCalculated}
            onManage={() => setActiveTab('scenarios')}
            onEdit={scenario => setEditScenarioId(scenario.id)}
          />
        ) },
        { value: 'scenarios', label: 'Scenarios', keepMounted: true, content: (
          <ScenarioManager
            scenarios={scenarios}
            onScenariosChange={handleScenariosRefresh}
            isLoading={isLoading}
            editScenarioId={editScenarioId}
            onEditHandled={() => setEditScenarioId(null)}
            onViewForecast={(scenarioId, calculated) => {
              handleScenarioSelect(scenarioId);
              if (calculated) handleCalculated();
              setActiveTab('results');
            }}
          />
        ) },
        { value: 'comparison', label: 'Compare', content: (
          <ScenarioComparison
            scenarios={scenarios}
            selectedScenarioIds={comparisonScenarioIds}
            onScenarioToggle={handleComparisonToggle}
            isLoading={isLoading}
            refreshVersion={refreshVersion}
            onCalculated={handleCalculated}
          />
        ) },
      ]} />
    </div>
  );
};

export default ProjectionDashboard;
