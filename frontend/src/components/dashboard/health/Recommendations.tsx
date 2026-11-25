import React, { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import RecommendationItem, { Recommendation } from './RecommendationItem';

interface RecommendationsProps {
  recommendations: Recommendation[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onUpdate: (id: number, isCompleted: boolean) => Promise<void>;
  onBulkUpdate: (ids: number[]) => Promise<void>;
}

const Recommendations: React.FC<RecommendationsProps> = ({
  recommendations,
  loading,
  error,
  onRetry,
  onUpdate,
  onBulkUpdate
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<number | null>(null);
  const [yearFilter, setYearFilter] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [failedIds, setFailedIds] = useState<Map<number, string>>(new Map());
  const [bulkPending, setBulkPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Extract unique years from recommendations
  const availableYears = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return [];

    const years = new Set<string>();
    recommendations.forEach(rec => {
      const year = new Date(rec.date_created).getFullYear().toString();
      years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [recommendations]);

  // Filter recommendations based on selected filters
  const filteredRecommendations = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return [];

    return recommendations.filter(rec => {
      if (priorityFilter !== null && rec.priority !== priorityFilter) {
        return false;
      }
      if (yearFilter !== null) {
        const recYear = new Date(rec.date_created).getFullYear().toString();
        if (recYear !== yearFilter) {
          return false;
        }
      }
      return true;
    });
  }, [recommendations, priorityFilter, yearFilter]);

  const handleToggle = async (rec: Recommendation, isCompleted: boolean) => {
    setPendingIds(prev => new Set(prev).add(rec.id));
    setStatusMessage(null);
    try {
      await onUpdate(rec.id, isCompleted);
      setStatusMessage(isCompleted ? 'Marked as complete.' : 'Moved back to active.');
      setFailedIds(prev => {
        const next = new Map(prev);
        next.delete(rec.id);
        return next;
      });
    } catch {
      setStatusMessage('Couldn\'t update that recommendation. Try again.');
      setFailedIds(prev => new Map(prev).set(rec.id, 'Couldn\'t save this change. Toggle it again to retry.'));
    } finally {
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(rec.id);
        return next;
      });
    }
  };

  const incompleteIds = filteredRecommendations
    .filter(r => !r.is_completed)
    .map(r => r.id);

  const confirmBulkComplete = async () => {
    setBulkPending(true);
    setStatusMessage(null);
    try {
      await onBulkUpdate(incompleteIds);
      setStatusMessage(`Marked ${incompleteIds.length} recommendations as complete.`);
    } catch {
      setStatusMessage('Some updates failed. Review the list and try again.');
    } finally {
      setBulkPending(false);
      setShowConfirmation(false);
    }
  };

  if (loading && recommendations.length === 0) {
    return (
      <div className="flex justify-center items-center h-32">
        <p className="text-[var(--color-text-muted)]">Loading recommendations…</p>
      </div>
    );
  }

  if (error && recommendations.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-32 gap-3">
        <p className="text-[var(--color-text-muted)]">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:opacity-90"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="flex justify-center items-center h-32">
        <p className="text-[var(--color-text-muted)] text-center max-w-sm">
          No recommendations to act on right now. New ones appear as your tracked data changes.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters and bulk action */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          aria-label="Filter by priority"
          className="text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
          value={priorityFilter === null ? '' : priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">All Priorities</option>
          <option value="5">Highest</option>
          <option value="4">High</option>
          <option value="3">Medium</option>
          <option value="2">Low</option>
          <option value="1">Lowest</option>
        </select>

        <select
          aria-label="Filter by year"
          className="text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
          value={yearFilter === null ? '' : yearFilter}
          onChange={(e) => setYearFilter(e.target.value === '' ? null : e.target.value)}
        >
          <option value="">All Years</option>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        {(priorityFilter !== null || yearFilter !== null) && (
          <button
            onClick={() => {
              setPriorityFilter(null);
              setYearFilter(null);
            }}
            className="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
          >
            Clear filters
          </button>
        )}

        <button
          onClick={() => setShowConfirmation(true)}
          disabled={incompleteIds.length === 0 || bulkPending}
          className={`ml-auto text-xs px-3 py-1 rounded ${incompleteIds.length === 0 || bulkPending
            ? 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400 cursor-not-allowed'
            : 'bg-accent/10 text-accent hover:bg-accent/20'}`}
        >
          Mark all as complete
        </button>
      </div>

      {/* Status feedback */}
      <div aria-live="polite" className="min-h-4 mb-2">
        {statusMessage && (
          <p className="text-xs text-[var(--color-text-muted)]">{statusMessage}</p>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog.Root open={showConfirmation} onOpenChange={setShowConfirmation}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
          <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
              <Dialog.Title className="text-lg font-medium mb-3 dark:text-white">
                Confirm bulk completion
              </Dialog.Title>
              <Dialog.Description className="text-gray-600 dark:text-gray-300 mb-4">
                Mark all {incompleteIds.length} visible incomplete recommendations as completed?
                You can bring them back by showing completed items and unchecking them.
              </Dialog.Description>
              <div className="flex justify-end space-x-2">
                <Dialog.Close asChild>
                  <button
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    disabled={bulkPending}
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  onClick={confirmBulkComplete}
                  disabled={bulkPending}
                  className="px-4 py-2 bg-accent text-white rounded hover:opacity-90 disabled:opacity-60"
                >
                  {bulkPending ? 'Marking…' : 'Confirm'}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {filteredRecommendations.length === 0 ? (
        <div className="flex justify-center items-center h-32">
          <p className="text-[var(--color-text-muted)]">No recommendations match your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecommendations.map(recommendation => (
            <RecommendationItem
              key={recommendation.id}
              recommendation={recommendation}
              expanded={expandedId === recommendation.id}
              pending={pendingIds.has(recommendation.id)}
              disabled={bulkPending}
              error={failedIds.get(recommendation.id) ?? null}
              onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
              onToggleComplete={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Recommendations;
