import React from 'react';
import { format } from 'date-fns';
import { usePrivacyMode } from '../../../contexts/PrivacyContext';

export interface Recommendation {
  id: number;
  title: string;
  description: string;
  category: string;
  impact_area: string;
  priority: number;
  estimated_score_improvement: number;
  is_completed: boolean;
  date_completed: string | null;
  date_created: string;
}

interface RecommendationItemProps {
  recommendation: Recommendation;
  expanded: boolean;
  pending: boolean;
  disabled: boolean;
  error?: string | null;
  onToggleExpand: (id: number) => void;
  onToggleComplete: (rec: Recommendation, isCompleted: boolean) => void;
}

const getPriorityColor = (priority: number) => {
  switch (priority) {
    case 5: return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    case 4: return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
    case 3: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
    case 2: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    default: return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
  }
};

const getPriorityLabel = (priority: number) => {
  switch (priority) {
    case 5: return 'Highest';
    case 4: return 'High';
    case 3: return 'Medium';
    case 2: return 'Low';
    default: return 'Lowest';
  }
};

const RecommendationItem: React.FC<RecommendationItemProps> = ({
  recommendation,
  expanded,
  pending,
  disabled,
  error,
  onToggleExpand,
  onToggleComplete
}) => {
  const { maskAmounts } = usePrivacyMode();
  const detailsId = `rec-details-${recommendation.id}`;
  const shortTitle = recommendation.title.length > 60
    ? `${recommendation.title.slice(0, 60)}…`
    : recommendation.title;

  return (
    <div
      className={`border rounded-lg overflow-hidden ${recommendation.is_completed ? 'bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}
    >
      <div className="p-3 flex items-center gap-3">
        <input
          type="checkbox"
          checked={recommendation.is_completed}
          disabled={pending || disabled}
          aria-label={`Mark as ${recommendation.is_completed ? 'not completed' : 'completed'}: ${shortTitle}`}
          onChange={(e) => onToggleComplete(recommendation, e.target.checked)}
          className="h-4 w-4 accent-accent focus:ring-accent rounded shrink-0"
        />
        <button
          type="button"
          className="flex flex-1 items-center justify-between gap-3 text-left min-w-0"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => onToggleExpand(recommendation.id)}
        >
          <span className={`min-w-0 ${recommendation.is_completed ? 'line-through text-gray-500 dark:text-gray-400' : 'dark:text-white'}`}>
            {maskAmounts(recommendation.title)}
          </span>
          <span className="flex items-center space-x-2 shrink-0">
            <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(recommendation.priority)}`}>
              {getPriorityLabel(recommendation.priority)}
            </span>
            {expanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </span>
        </button>
      </div>

      {error && (
        <p role="alert" className="px-3 pb-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {expanded && (
        <div id={detailsId} className="px-3 pb-3 pt-0">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            {maskAmounts(recommendation.description)}
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div>
              <span className="font-medium dark:text-gray-300">Impact area:</span> {recommendation.impact_area}
            </div>
            <div>
              <span className="font-medium dark:text-gray-300">Estimated improvement:</span> ≈ +{recommendation.estimated_score_improvement} pts
            </div>
            <div>
              <span className="font-medium dark:text-gray-300">Created:</span> {format(new Date(recommendation.date_created), 'MMM d, yyyy')}
            </div>
            {recommendation.is_completed && recommendation.date_completed && (
              <div>
                <span className="font-medium dark:text-gray-300">Completed:</span> {format(new Date(recommendation.date_completed), 'MMM d, yyyy')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendationItem;
