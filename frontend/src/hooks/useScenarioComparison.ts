import { useState, useEffect, useCallback } from 'react';
import { compareScenarios, calculateProjection } from '../services/projectionService';

export const useScenarioComparison = (selectedScenarioIds: number[]) => {
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load comparison data when selected scenarios change
  const loadComparison = useCallback(async () => {
    if (selectedScenarioIds.length === 0) {
      setComparisonData(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await compareScenarios(selectedScenarioIds);
      setComparisonData(data);
    } catch (err) {
      console.error('Error loading scenario comparison:', err);
      setComparisonData(null);
      setError('No comparison data. Calculate projections for selected scenarios first.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedScenarioIds]);

  // Calculate projections for all selected scenarios
  const calculateAll = useCallback(async () => {
    if (selectedScenarioIds.length === 0) {
      setError('No scenarios selected. Select at least one scenario to calculate.');
      return;
    }
    
    try {
      setIsCalculating(true);
      setError(null);
      
      // Calculate projections for all selected scenarios
      for (const scenarioId of selectedScenarioIds) {
        await calculateProjection(scenarioId);
      }
      
      // Load comparison data after calculations
      const data = await compareScenarios(selectedScenarioIds);
      setComparisonData(data);
    } catch (err) {
      console.error('Error calculating projections:', err);
      setError('Failed to calculate projections');
    } finally {
      setIsCalculating(false);
    }
  }, [selectedScenarioIds]);

  // Load comparison data when selected scenarios change
  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  return {
    comparisonData,
    isCalculating,
    isLoading,
    error,
    calculateAll,
    refreshData: loadComparison
  };
};
