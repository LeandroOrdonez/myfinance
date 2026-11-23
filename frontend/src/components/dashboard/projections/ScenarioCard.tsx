import React from 'react';
import { Edit, Trash2, RefreshCw } from 'lucide-react';
import { ProjectionScenario } from '../../../types/projections';

interface ScenarioCardProps {
  scenario: ProjectionScenario;
  busy: boolean;
  isCalculating: boolean;
  isRecomputing: boolean;
  onCalculate: () => void;
  onView?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRecompute: () => void;
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, busy, isCalculating, isRecomputing, onCalculate, onView, onEdit, onDelete, onRecompute }) => (
  <article className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex flex-col gap-4 min-w-0">
    <div>
      <h3 className="text-lg font-medium break-words">{scenario.name}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {scenario.is_default && <span className="text-blue-700 dark:text-blue-300 font-medium mr-2">Default</span>}
        Created {new Date(scenario.created_at).toLocaleDateString()}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 break-words">{scenario.description}</p>
    </div>
    <div className="flex flex-wrap gap-2 mt-auto">
      {onView && <button type="button" disabled={busy} onClick={onView} className="min-h-11 px-3 py-2 text-sm text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-md disabled:opacity-50">View forecast</button>}
      <button type="button" disabled={busy} onClick={onCalculate} className="min-h-11 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">{isCalculating ? 'Calculating…' : 'Calculate'}</button>
      <button type="button" disabled={busy} onClick={onEdit} aria-label={`Edit ${scenario.name}`} className="min-h-11 min-w-11 p-2 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"><Edit className="h-4 w-4" aria-hidden="true" /></button>
      <button type="button" disabled={busy || scenario.is_default} onClick={onDelete} aria-label={`Delete ${scenario.name}`} title={scenario.is_default ? 'Default scenarios cannot be deleted' : undefined} className="min-h-11 min-w-11 p-2 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
      {scenario.is_base_scenario && <button type="button" disabled={busy} onClick={onRecompute} className="min-h-11 px-3 py-2 flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50"><RefreshCw className={`h-4 w-4 shrink-0 ${isRecomputing ? 'animate-spin' : ''}`} aria-hidden="true" />{isRecomputing ? 'Refreshing assumptions…' : 'Refresh assumptions from transactions'}</button>}
    </div>
  </article>
);
