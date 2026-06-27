import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { X, Sparkles } from 'lucide-react';
import { ExpenseCategory } from '../../types/transaction';
import { Budget } from '../../types/budget';
import { budgetService } from '../../services/budgetService';

interface BudgetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Budget being edited; undefined when creating. */
  budget?: Budget;
  /** Categories that already have a budget (excluded from the create select). */
  existingCategories: string[];
  /** Called after a successful create/update so the page can refresh. */
  onSaved: () => void;
}

export const BudgetFormDialog: React.FC<BudgetFormDialogProps> = ({
  open,
  onOpenChange,
  budget,
  existingCategories,
  onSaved,
}) => {
  const isEdit = Boolean(budget);
  const [category, setCategory] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableCategories = Object.values(ExpenseCategory).filter(
    (c) => !existingCategories.includes(c)
  );

  useEffect(() => {
    if (open) {
      setCategory(budget ? String(budget.category) : '');
      setLimitAmount(budget ? String(budget.limit_amount) : '');
      setHint(null);
      setError(null);
    }
  }, [open, budget]);

  const handleSuggest = async () => {
    if (!category) return;
    try {
      setSuggesting(true);
      setError(null);
      const suggestion = await budgetService.getSuggestion(category);
      if (suggestion.months_analyzed > 0) {
        setLimitAmount(String(suggestion.suggested_limit));
        setHint(`${suggestion.percentile}th percentile of last ${suggestion.months_analyzed} months`);
      } else {
        setHint('No spending history found for this category yet');
      }
    } catch (err) {
      setError('Failed to fetch suggestion');
      console.error('Error fetching suggestion:', err);
    } finally {
      setSuggesting(false);
    }
  };

  const handleSubmit = async () => {
    const amount = parseFloat(limitAmount);
    if (!category || isNaN(amount) || amount <= 0) {
      setError('Please choose a category and a positive limit');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      if (isEdit && budget) {
        await budgetService.updateBudget(budget.id, { limit_amount: amount });
      } else {
        await budgetService.createBudget({ category, limit_amount: amount });
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(detail || 'Failed to save budget');
      console.error('Error saving budget:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in" />
        <Dialog.Content
          className={clsx(
            'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
            'w-[90vw] max-w-md z-50 p-6 rounded-2xl',
            'bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl'
          )}
        >
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-semibold text-[var(--color-text-primary)]">
              {isEdit ? 'Edit budget' : 'Add budget'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isEdit}
                className={clsx(
                  'w-full px-3 py-2 rounded-lg text-sm',
                  'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]',
                  'text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-accent',
                  isEdit && 'opacity-60 cursor-not-allowed'
                )}
              >
                <option value="" disabled>
                  Select a category
                </option>
                {isEdit && budget && (
                  <option value={String(budget.category)}>{String(budget.category)}</option>
                )}
                {!isEdit &&
                  availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
            </div>

            {/* Limit amount */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Monthly limit (EUR)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  placeholder="0.00"
                  className={clsx(
                    'flex-1 px-3 py-2 rounded-lg text-sm',
                    'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]',
                    'text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-accent'
                  )}
                />
                <button
                  type="button"
                  onClick={handleSuggest}
                  disabled={!category || suggesting}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap',
                    'bg-accent/10 text-accent hover:bg-accent/20 transition-colors',
                    (!category || suggesting) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  {suggesting ? 'Suggesting…' : 'Suggest'}
                </button>
              </div>
              {hint && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>}
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Dialog.Close asChild>
              <button className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium bg-accent text-white hover:bg-accent-dark transition-colors',
                saving && 'opacity-50 cursor-not-allowed'
              )}
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create budget'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default BudgetFormDialog;
