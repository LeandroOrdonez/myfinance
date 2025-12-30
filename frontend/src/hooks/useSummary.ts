import { useState, useEffect, useCallback } from 'react';
import { FinancialSummaryResponse } from '../types/summary';
import { summaryService } from '../services/summaryService';

export const useSummary = () => {
  const [data, setData] = useState<FinancialSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const result = await summaryService.getSummary();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching financial summary:', err);
      setError('Failed to load financial summary. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();

    const handleDataUpdate = () => {
      fetchSummary();
    };

    window.addEventListener('finance-data-updated', handleDataUpdate);
    return () => {
      window.removeEventListener('finance-data-updated', handleDataUpdate);
    };
  }, [fetchSummary]);

  return { data, loading, error, refreshSummary: fetchSummary };
};
