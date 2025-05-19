import React, { useState } from 'react';
import ScenarioManager from './ScenarioManager';
import ResultsVisualization from './ResultsVisualization';
import ScenarioComparison from './ScenarioComparison';
import { useProjectionScenarios } from '../../../hooks/useProjectionScenarios';

const ProjectionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('scenarios');
  
  // Use the custom hook for managing projection scenarios
  const {
    scenarios,
    selectedScenarioId,
    comparisonScenarioIds,
    isLoading,
    handleScenarioSelect,
    handleComparisonToggle,
    refreshScenarios
  } = useProjectionScenarios();
  
  // Handle scenario refresh after create/update/delete
  const handleScenariosRefresh = () => {
    refreshScenarios();
  };

  return (
    <div className="space-y-4">      
      <div className="w-full">
        <div className="border-b">
          <div className="flex w-full">
            <button 
              onClick={() => setActiveTab('scenarios')}
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'scenarios' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Scenario Manager
            </button>
            <button 
              onClick={() => setActiveTab('results')}
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'results' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Results Visualization
            </button>
            <button 
              onClick={() => setActiveTab('comparison')}
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'comparison' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Scenario Comparison
            </button>
          </div>
        </div>
        
        <div className="mt-4">
          {activeTab === 'scenarios' && (
            <ScenarioManager 
              scenarios={scenarios} 
              onScenariosChange={handleScenariosRefresh} 
              isLoading={isLoading}
            />
          )}
          
          {activeTab === 'results' && (
            <ResultsVisualization 
              scenarios={scenarios}
              selectedScenarioId={selectedScenarioId}
              onScenarioSelect={handleScenarioSelect}
              isLoading={isLoading}
            />
          )}
          
          {activeTab === 'comparison' && (
            <ScenarioComparison 
              scenarios={scenarios}
              selectedScenarioIds={comparisonScenarioIds}
              onScenarioToggle={handleComparisonToggle}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectionDashboard;
