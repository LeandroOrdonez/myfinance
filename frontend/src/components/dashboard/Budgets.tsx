import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { budgetService } from '../../services/budgetService';
import { Budget, BudgetProgress } from '../../types/budget';
import { usePrivacyMode } from '../../contexts/PrivacyContext';
import { formatPrivateAmount } from '../../utils/formatPrivateAmount';
import { DashboardCard } from './DashboardCard';
import { Loading } from '../common/Loading';

export const Budgets: React.FC = () => {
  const { privacyMode } = usePrivacyMode();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [progress, setProgress] = useState<BudgetProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number) =>
    formatPrivateAmount(
      value,
      privacyMode,
      (n) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(n)
    );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [budgetsData, progressData] = await Promise.all([
        budgetService.getBudgets(),
        budgetService.getProgress(),
      ]);
      setBudgets(budgetsData);
      setProgress(progressData);
      setError(null);
    } catch (err) {
      setError('Failed to load budgets');
      console.error('Error loading budgets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  const progressByCategory = new Map(progress.map((p) => [p.category, p]));

  if (loading) {
    return <Loading variant="progress" size="large" />;
  }

  if (error) {
    return (
      <div className="mt-4">
        <DashboardCard>
          <p className="text-center text-[var(--color-danger)] py-6">{error}</p>
        </DashboardCard>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Budgets</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Set monthly spending limits per category and track your progress.
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white font-medium hover:bg-accent-dark transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          Add budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <DashboardCard>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Wallet className="w-10 h-10 text-[var(--color-text-muted)] mb-3" />
            <p className="text-[var(--color-text-primary)] font-medium">No budgets yet</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Create a budget to start tracking your category spending.
            </p>
          </div>
        </DashboardCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => {
            const p = progressByCategory.get(budget.category);
            return (
              <DashboardCard key={budget.id} title={String(budget.category)}>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Limit</span>
                    <span className="text-[var(--color-text-primary)]">
                      {formatCurrency(budget.limit_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Spent</span>
                    <span className="text-[var(--color-text-primary)]">
                      {formatCurrency(p ? p.spent : 0)}
                    </span>
                  </div>
                  {p && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-muted)]">Progress</span>
                      <span className="text-[var(--color-text-primary)]">{p.percentage}%</span>
                    </div>
                  )}
                </div>
              </DashboardCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Budgets;
