import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProjectionResults, calculateProjection } from '../services/projectionService';
import { usePrivacyMode } from '../contexts/PrivacyContext';
import { formatPrivateAmount } from '../utils/formatPrivateAmount';
import { ProjectionTimeseries } from '../types/projections';

export const useProjectionResults = (selectedScenarioId: number | null, showReal = false, refreshVersion = 0) => {
  const { privacyMode } = usePrivacyMode();
  const [projectionData, setProjectionData] = useState<ProjectionTimeseries | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedAt, setCalculatedAt] = useState<Date | null>(null);
  const requestId = useRef(0);
  const calculating = useRef(false);

  // Load projection results when selected scenario changes
  const loadResults = useCallback(async () => {
    const request = ++requestId.current;
    if (!selectedScenarioId) {
      setProjectionData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchProjectionResults(selectedScenarioId);
      if (request === requestId.current) setProjectionData(data);
    } catch (err) {
      if (request === requestId.current) {
        setError('Could not load the saved forecast. Retry loading, or calculate a forecast with the current assumptions.');
      }
    } finally {
      if (request === requestId.current) setIsLoading(false);
    }
  }, [selectedScenarioId]);

  // Calculate projection for the selected scenario
  const calculateResults = useCallback(async () => {
    if (!selectedScenarioId || calculating.current) return false;
    const request = ++requestId.current;
    calculating.current = true;
    try {
      setIsLoading(false);
      setIsCalculating(true);
      setError(null);
      await calculateProjection(selectedScenarioId);
      
      // Reload results after calculation
      const data = await fetchProjectionResults(selectedScenarioId);
      if (!data) throw new Error('No saved forecast after calculation');
      if (request !== requestId.current) return false;
      setProjectionData(data);
      setCalculatedAt(new Date());
      return true;
    } catch (err) {
      if (request === requestId.current) setError('Could not calculate and load the forecast. Showing the previously loaded results, not a confirmed refresh. Retry loading to check the saved forecast, or calculate again.');
      return false;
    } finally {
      if (request === requestId.current) {
        calculating.current = false;
        setIsCalculating(false);
      }
    }
  }, [selectedScenarioId]);

  // Format currency helper
  const formatCurrency = (value: number | undefined) =>
    value === undefined || !Number.isFinite(value) ? 'Unavailable' : formatPrivateAmount(
      value,
      privacyMode,
      (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
    );

  // Get projection summary data
  const getSummaryData = useCallback((real = showReal) => {
    const summary = (index: number) => {
      const available = projectionData && index < projectionData.dates.length;
      return {
        netWorth: available ? (real ? projectionData.real_projected_net_worth : projectionData.projected_net_worth)?.[index] : undefined,
        savings: available ? (real ? projectionData.real_projected_savings : projectionData.projected_savings)?.[index] : undefined,
        investments: available ? (real ? projectionData.real_projected_investments : projectionData.projected_investments)?.[index] : undefined,
      };
    };
    return { oneYear: summary(11), threeYears: summary(35), fiveYears: summary(59) };
  }, [projectionData, showReal]);

  // Load results when the selected scenario changes
  useEffect(() => {
    setProjectionData(null);
    setCalculatedAt(null);
    setIsCalculating(false);
    calculating.current = false;
    loadResults();
    return () => { requestId.current += 1; };
  }, [loadResults, refreshVersion]);

  return {
    projectionData,
    isCalculating,
    isLoading,
    error,
    calculatedAt,
    calculateResults,
    formatCurrency,
    getSummaryData,
    refreshData: loadResults
  };
};
