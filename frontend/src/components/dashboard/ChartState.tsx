import React from 'react';
import { Loading } from '../common/Loading';
import { RotateCcw } from 'lucide-react';

interface ChartStateProps {
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  heightClass?: string;
  children?: React.ReactNode;
}

export const ChartState: React.FC<ChartStateProps> = ({
  loading,
  error,
  isEmpty,
  emptyMessage = 'No data available for this period',
  onRetry,
  heightClass = 'h-[400px]',
  children
}) => {
  if (loading) {
    return (
      <div className={`${heightClass} flex items-center justify-center`}>
        <Loading variant="skeleton" size="small" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${heightClass} flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400`} role="alert">
        <p>{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <RotateCcw size={14} />
            Try again
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={`${heightClass} flex items-center justify-center text-gray-500 dark:text-gray-400`}>
        {emptyMessage}
      </div>
    );
  }

  return <>{children}</>;
};
