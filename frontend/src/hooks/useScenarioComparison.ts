import { useState, useEffect, useCallback, useRef } from 'react';
import { compareScenarios, calculateProjection } from '../services/projectionService';
import { ScenarioComparison } from '../types/projections';

export const useScenarioComparison = (selectedScenarioIds: number[], refreshVersion = 0) => {
  const [comparisonData, setComparisonData] = useState<ScenarioComparison | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedAt, setCalculatedAt] = useState<Date | null>(null);
  const requestId = useRef(0);
  const calculating = useRef(false);

  // Load comparison data when selected scenarios change
  const loadComparison = useCallback(async () => {
    const request = ++requestId.current;
    if (selectedScenarioIds.length === 0) {
      setComparisonData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await compareScenarios(selectedScenarioIds);
      if (request === requestId.current) setComparisonData(data);
    } catch (err) {
      if (request === requestId.current) setError('Could not load the comparison. Retry loading, or recalculate the selected scenarios.');
    } finally {
      if (request === requestId.current) setIsLoading(false);
    }
  }, [selectedScenarioIds]);

  // Calculate projections for all selected scenarios
  const calculateAll = useCallback(async () => {
    if (selectedScenarioIds.length === 0 || calculating.current) return false;
    const request = ++requestId.current;
    calculating.current = true;
    try {
      setIsLoading(false);
      setIsCalculating(true);
      setError(null);
      
      // Calculate projections for all selected scenarios
      for (const scenarioId of selectedScenarioIds) {
        await calculateProjection(scenarioId);
      }
      
      // Load comparison data after calculations
      const data = await compareScenarios(selectedScenarioIds);
      if (request !== requestId.current) return false;
      setComparisonData(data);
      setCalculatedAt(new Date());
      return true;
    } catch (err) {
      if (request === requestId.current) setError('Could not calculate all selected scenarios. Some may have completed; the previous comparison is still shown if available. Recalculate all selected scenarios to retry.');
      return false;
    } finally {
      if (request === requestId.current) {
        calculating.current = false;
        setIsCalculating(false);
      }
    }
  }, [selectedScenarioIds]);

  // Load comparison data when selected scenarios change
  useEffect(() => {
    setComparisonData(null);
    setCalculatedAt(null);
    setIsCalculating(false);
    calculating.current = false;
    loadComparison();
    return () => { requestId.current += 1; };
  }, [loadComparison, refreshVersion]);

  return {
    comparisonData,
    isCalculating,
    isLoading,
    error,
    calculatedAt,
    calculateAll,
    refreshData: loadComparison
  };
};
