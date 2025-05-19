import { useState, useEffect, useCallback } from 'react';
import { fetchProjectionResults, calculateProjection } from '../services/projectionService';

export const useProjectionResults = (selectedScenarioId: number | null) => {
  const [projectionData, setProjectionData] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load projection results when selected scenario changes
  const loadResults = useCallback(async () => {
    if (!selectedScenarioId) {
      setProjectionData(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchProjectionResults(selectedScenarioId);
      setProjectionData(data);
    } catch (err) {
      console.error('Error loading projection results:', err);
      setProjectionData(null);
      setError('No projection data. Calculate the projection first to view results.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedScenarioId]);

  // Calculate projection for the selected scenario
  const calculateResults = useCallback(async () => {
    if (!selectedScenarioId) return;
    
    try {
      setIsCalculating(true);
      setError(null);
      await calculateProjection(selectedScenarioId);
      
      // Reload results after calculation
      const data = await fetchProjectionResults(selectedScenarioId);
      setProjectionData(data);
    } catch (err) {
      console.error('Error calculating projection:', err);
      setError('Failed to calculate projection');
    } finally {
      setIsCalculating(false);
    }
  }, [selectedScenarioId]);

  // Format currency helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get projection summary data
  const getSummaryData = useCallback(() => {
    if (!projectionData || !projectionData.dates || projectionData.dates.length === 0) {
      return {
        oneYear: { netWorth: 0, savings: 0, investments: 0 },
        threeYears: { netWorth: 0, savings: 0, investments: 0 },
        fiveYears: { netWorth: 0, savings: 0, investments: 0 },
      };
    }

    const oneYearIndex = Math.min(11, projectionData.dates.length - 1);
    const threeYearIndex = Math.min(35, projectionData.dates.length - 1);
    const fiveYearIndex = Math.min(59, projectionData.dates.length - 1);

    return {
      oneYear: {
        netWorth: projectionData.projected_net_worth[oneYearIndex],
        savings: projectionData.projected_savings[oneYearIndex],
        investments: projectionData.projected_investments[oneYearIndex],
      },
      threeYears: {
        netWorth: projectionData.projected_net_worth[threeYearIndex],
        savings: projectionData.projected_savings[threeYearIndex],
        investments: projectionData.projected_investments[threeYearIndex],
      },
      fiveYears: {
        netWorth: projectionData.projected_net_worth[fiveYearIndex],
        savings: projectionData.projected_savings[fiveYearIndex],
        investments: projectionData.projected_investments[fiveYearIndex],
      },
    };
  }, [projectionData]);

  // Load results when the selected scenario changes
  useEffect(() => {
    loadResults();
  }, [loadResults]);

  return {
    projectionData,
    isCalculating,
    isLoading,
    error,
    calculateResults,
    formatCurrency,
    getSummaryData,
    refreshData: loadResults
  };
};
