import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { financialHealthService } from '../../services/financialHealthService';
import { FinancialHealthScore, FinancialHealthHistory, Recommendation } from '../../types/transaction';
import { usePrivacyMode } from '../../contexts/PrivacyContext';
import HealthScoreGauge from './health/HealthScoreGauge';
import ComponentScores from './health/ComponentScores';
import HealthTrends from './health/HealthTrends';
import Recommendations from './health/Recommendations';
import PeriodSelector from '../common/PeriodSelector';
import { DashboardCard } from './DashboardCard';

interface FinancialHealthProps {
  className?: string;
}

const NEXT_STEP_LINKS: Record<string, { to: string; label: string }> = {
  budget_adherence: { to: '/budgets', label: 'Review budgets' },
  expense_ratio: { to: '/transactions', label: 'Review transactions' },
  spending_stability: { to: '/transactions', label: 'Review transactions' },
  debt_to_income: { to: '/transactions', label: 'Review transactions' },
  savings_rate: { to: '/analytics', label: 'View analytics' },
  emergency_fund: { to: '/analytics', label: 'View analytics' },
  investment_rate: { to: '/analytics', label: 'View analytics' },
  general: { to: '/analytics', label: 'View analytics' },
};

const isCanceled = (err: unknown): boolean => {
  const e = err as { code?: string; name?: string };
  return e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError';
};

const METRIC_FIELDS: Record<string, { scoreKey: keyof FinancialHealthScore; valueKey: keyof FinancialHealthScore; format: 'percent' | 'months' }> = {
  savings_rate: { scoreKey: 'savings_rate_score', valueKey: 'savings_rate', format: 'percent' },
  expense_ratio: { scoreKey: 'expense_ratio_score', valueKey: 'expense_ratio', format: 'percent' },
  budget_adherence: { scoreKey: 'budget_adherence_score', valueKey: 'budget_adherence', format: 'percent' },
  debt_to_income: { scoreKey: 'debt_to_income_score', valueKey: 'debt_to_income', format: 'percent' },
  emergency_fund: { scoreKey: 'emergency_fund_score', valueKey: 'emergency_fund_months', format: 'months' },
  spending_stability: { scoreKey: 'spending_stability_score', valueKey: 'spending_stability', format: 'percent' },
  investment_rate: { scoreKey: 'investment_rate_score', valueKey: 'investment_rate', format: 'percent' },
};

const FinancialHealth: React.FC<FinancialHealthProps> = ({ className }) => {
  const { maskAmounts } = usePrivacyMode();
  const [healthData, setHealthData] = useState<FinancialHealthScore | null>(null);
  const [historyData, setHistoryData] = useState<FinancialHealthHistory | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [scoreLoading, setScoreLoading] = useState<boolean>(true);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const [recsLoading, setRecsLoading] = useState<boolean>(true);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [recsError, setRecsError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('6m');
  const [includeCompleted, setIncludeCompleted] = useState<boolean>(false);

  const fetchHealthData = useCallback(async (signal?: AbortSignal) => {
    try {
      setScoreLoading(true);
      setScoreError(null);
      const data = await financialHealthService.getFinancialHealthScore(undefined, signal);
      setHealthData(data);
    } catch (err) {
      if (isCanceled(err)) return;
      // If no pre-computed score exists (404), trigger a recalculation
      if ((err as { response?: { status?: number } })?.response?.status === 404) {
        try {
          const data = await financialHealthService.recalculateHealthScore();
          setHealthData(data);
          return;
        } catch (recalcErr) {
          console.error('Error recalculating health score:', recalcErr);
        }
      }
      console.error('Error fetching health score:', err);
      setScoreError('Couldn\'t load your financial health score.');
    } finally {
      setScoreLoading(false);
    }
  }, []);

  const fetchHistoryData = useCallback(async (signal?: AbortSignal) => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const months = period === '3m' ? 3 :
                    period === '6m' ? 6 :
                    period === 'ytd' ? new Date().getMonth() + 1 :
                    period === '1y' ? 12 :
                    period === '2y' ? 24 : 120;

      const data = await financialHealthService.getFinancialHealthHistory(months, signal);
      setHistoryData(data);
    } catch (err) {
      if (isCanceled(err)) return;
      console.error('Error fetching health history:', err);
      setHistoryError('Couldn\'t load score history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [period]);

  const fetchRecommendations = useCallback(async (signal?: AbortSignal) => {
    try {
      setRecsLoading(true);
      setRecsError(null);
      const data = await financialHealthService.getRecommendations(!includeCompleted, signal);
      setRecommendations(data);
    } catch (err) {
      if (isCanceled(err)) return;
      console.error('Error fetching recommendations:', err);
      setRecsError('Couldn\'t load recommendations.');
    } finally {
      setRecsLoading(false);
    }
  }, [includeCompleted]);

  const handleRecommendationUpdate = async (id: number, isCompleted: boolean) => {
    await financialHealthService.updateRecommendation(id, isCompleted);
    await fetchRecommendations();
  };

  const handleBulkUpdate = async (ids: number[]) => {
    const results = await Promise.allSettled(
      ids.map(id => financialHealthService.updateRecommendation(id, true))
    );
    await fetchRecommendations();
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      throw new Error(`${failed} of ${ids.length} updates failed`);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchHealthData(controller.signal);
    return () => controller.abort();
  }, [fetchHealthData]);

  useEffect(() => {
    const controller = new AbortController();
    fetchRecommendations(controller.signal);
    return () => controller.abort();
  }, [fetchRecommendations]);

  useEffect(() => {
    const controller = new AbortController();
    fetchHistoryData(controller.signal);
    return () => controller.abort();
  }, [fetchHistoryData]);

  useEffect(() => {
    const handleDataUpdate = () => {
      fetchHealthData();
      fetchRecommendations();
      fetchHistoryData();
    };
    window.addEventListener('finance-data-updated', handleDataUpdate);
    return () => window.removeEventListener('finance-data-updated', handleDataUpdate);
  }, [fetchHealthData, fetchRecommendations, fetchHistoryData]);

  const nextStep = recommendations
    .filter(r => !r.is_completed)
    .sort((a, b) => b.priority - a.priority)[0];
  const nextStepLink = nextStep ? NEXT_STEP_LINKS[nextStep.category] ?? NEXT_STEP_LINKS.general : null;
  const nextStepMetric = nextStep && healthData ? METRIC_FIELDS[nextStep.category] : undefined;
  const nextStepMetricText = nextStepMetric
    ? `${(healthData![nextStepMetric.scoreKey] as number).toFixed(0)}/100 · currently ${
        nextStepMetric.format === 'months'
          ? `${(healthData![nextStepMetric.valueKey] as number).toFixed(1)} months`
          : `${((healthData![nextStepMetric.valueKey] as number) * 100).toFixed(1)}%`
      }`
    : null;

  if (scoreLoading && !healthData) {
    return (
      <div className={className}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Financial Health</h1>
        </div>
        <DashboardCard>
          <div className="flex justify-center items-center h-64">
            <p className="text-[var(--color-text-muted)]">Loading financial health data…</p>
          </div>
        </DashboardCard>
      </div>
    );
  }

  if (scoreError && !healthData) {
    return (
      <div className={className}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Financial Health</h1>
        </div>
        <DashboardCard>
          <div className="flex flex-col justify-center items-center h-64 gap-3">
            <p className="text-[var(--color-text-muted)]">{scoreError}</p>
            <button
              onClick={() => fetchHealthData()}
              className="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:opacity-90"
            >
              Try again
            </button>
          </div>
        </DashboardCard>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Financial Health</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          A snapshot based on your tracked transactions — an indicator, not a credit score or financial advice.
        </p>
      </div>

      {healthData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DashboardCard
            title="Overall score"
            className="lg:col-start-1 lg:row-start-1 self-start"
            headerExtra={
              <span className="text-xs text-[var(--color-text-muted)]">
                As of {format(new Date(healthData.date), 'MMM d, yyyy')}
              </span>
            }
          >
            <HealthScoreGauge score={healthData.overall_score} />
          </DashboardCard>

          {nextStep && nextStepLink && (
            <DashboardCard
              variant="highlight"
              title="Suggested next step"
              className="lg:col-start-2 lg:col-span-2 lg:row-start-1 self-start w-full"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {maskAmounts(nextStep.title)}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    {maskAmounts(nextStep.description)}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    Impacts {nextStep.impact_area}
                    {nextStepMetricText ? ` (${nextStepMetricText})` : ''}
                    {' '}· estimated improvement ≈ +{nextStep.estimated_score_improvement} pts
                  </p>
                </div>
                <Link
                  to={nextStepLink.to}
                  className="shrink-0 self-start sm:self-center px-4 py-2 text-sm rounded-lg bg-accent text-white hover:opacity-90"
                >
                  {nextStepLink.label}
                </Link>
              </div>
            </DashboardCard>
          )}

          <DashboardCard
            title="Score history"
            className={`lg:col-start-2 lg:col-span-2 self-start w-full ${nextStep && nextStepLink ? 'lg:row-start-2' : 'lg:row-start-1'}`}
            headerExtra={
              <PeriodSelector
                selectedPeriod={period}
                onChange={setPeriod}
                ariaLabel="Score history period"
              />
            }
          >
            <HealthTrends
              historyData={historyData}
              loading={historyLoading}
              error={historyError}
              onRetry={() => fetchHistoryData()}
            />
          </DashboardCard>

          <DashboardCard
            title="Recommendations"
            className={`lg:col-start-2 lg:col-span-2 self-start w-full ${nextStep && nextStepLink ? 'lg:row-start-3' : 'lg:row-start-2'}`}
            headerExtra={
              <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCompleted}
                  onChange={(e) => setIncludeCompleted(e.target.checked)}
                  className="h-3.5 w-3.5 accent-accent focus:ring-accent rounded"
                />
                Show completed
              </label>
            }
          >
            <Recommendations
              recommendations={recommendations}
              loading={recsLoading}
              error={recsError}
              onRetry={() => fetchRecommendations()}
              onUpdate={handleRecommendationUpdate}
              onBulkUpdate={handleBulkUpdate}
            />
          </DashboardCard>

          <DashboardCard
            title="Score breakdown"
            className={`lg:col-start-1 lg:row-start-2 ${nextStep && nextStepLink ? 'lg:row-span-2' : ''}`}
          >
            <ComponentScores healthData={healthData} />
          </DashboardCard>
        </div>
      )}
    </div>
  );
};

export default FinancialHealth;
