import React from 'react';
import clsx from 'clsx';
import { Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Budget, BudgetProgress, BudgetStatus } from '../../types/budget';
import { usePrivacyMode } from '../../contexts/PrivacyContext';
import { formatPrivateAmount } from '../../utils/formatPrivateAmount';
import { DashboardCard } from './DashboardCard';

interface BudgetCardProps {
  budget: Budget;
  progress?: BudgetProgress;
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
}

const STATUS_STYLES: Record<BudgetStatus, { bar: string; text: string; label: string }> = {
  on_track: { bar: 'bg-emerald-500', text: 'text-emerald-600', label: 'On track' },
  warning: { bar: 'bg-amber-500', text: 'text-amber-600', label: 'Warning' },
  over: { bar: 'bg-rose-500', text: 'text-rose-600', label: 'Over budget' },
};

export const BudgetCard: React.FC<BudgetCardProps> = ({ budget, progress, onEdit, onDelete }) => {
  const { privacyMode } = usePrivacyMode();

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

  const status: BudgetStatus = progress ? progress.status : 'on_track';
  const percentage = progress ? progress.percentage : 0;
  const spent = progress ? progress.spent : 0;
  const remaining = progress ? progress.remaining : budget.limit_amount;
  const styles = STATUS_STYLES[status];
  const barWidth = Math.min(percentage, 100);

  return (
    <DashboardCard>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-semibold text-lg text-[var(--color-text-primary)]">
            {String(budget.category)}
          </h4>
          {status === 'over' && (
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
              <AlertTriangle className="w-3 h-3" />
              Over budget
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(budget)}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            aria-label="Edit budget"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(budget)}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-rose-600 hover:bg-[var(--color-bg-tertiary)] transition-colors"
            aria-label="Delete budget"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', styles.bar)}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className={clsx('text-sm font-semibold', styles.text)}>{percentage}%</span>
        <span className={clsx('text-xs font-medium', styles.text)}>{styles.label}</span>
      </div>

      <div className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Spent</span>
          <span className="text-[var(--color-text-primary)] font-medium">
            {formatCurrency(spent)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Limit</span>
          <span className="text-[var(--color-text-primary)] font-medium">
            {formatCurrency(budget.limit_amount)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Remaining</span>
          <span
            className={clsx(
              'font-medium',
              remaining < 0 ? 'text-rose-600' : 'text-[var(--color-text-primary)]'
            )}
          >
            {formatCurrency(remaining)}
          </span>
        </div>
      </div>
    </DashboardCard>
  );
};

export default BudgetCard;
