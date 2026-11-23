import { useState, useEffect, useCallback } from 'react';
import { ProjectionScenario } from '../types/projections';
import { fetchScenarios } from '../services/projectionService';

export const useProjectionScenarios = () => {
  const [scenarios, setScenarios] = useState<ProjectionScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const [comparisonScenarioIds, setComparisonScenarioIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load scenarios
  const loadScenarios = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchScenarios();
      setScenarios(data);
      
      // Select the first scenario by default if available and no scenario is currently selected
      const defaultId = data.find(scenario => scenario.is_default)?.id ?? data[0]?.id ?? null;
      setSelectedScenarioId(current => data.some(scenario => scenario.id === current) ? current : defaultId);
      // Only set comparison IDs if they're empty
      setComparisonScenarioIds(current => current.length === 0 && defaultId !== null
        ? [defaultId]
        : current.filter(id => data.some(scenario => scenario.id === id)));
      
      setError(null);
    } catch (err) {
      console.error('Error loading scenarios:', err);
      setError('Failed to load projection scenarios');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle scenario selection for results view
  const handleScenarioSelect = useCallback((scenarioId: number) => {
    setSelectedScenarioId(scenarioId);
  }, []);

  // Handle scenario selection for comparison view
  const handleComparisonToggle = useCallback((scenarioId: number) => {
    setComparisonScenarioIds(prev => {
      if (prev.includes(scenarioId)) {
        return prev.filter(id => id !== scenarioId);
      } else {
        return [...prev, scenarioId];
      }
    });
  }, []);

  // Initial load
  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  return {
    scenarios,
    selectedScenarioId,
    comparisonScenarioIds,
    isLoading,
    error,
    handleScenarioSelect,
    handleComparisonToggle,
    refreshScenarios: loadScenarios
  };
};
