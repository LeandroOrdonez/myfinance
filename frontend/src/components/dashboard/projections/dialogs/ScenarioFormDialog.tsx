import React, { useState } from 'react';
import { ProjectionParameterCreate } from '../../../../types/projections';
import ParameterEditor from '../ParameterEditor';
import Dialog from './Dialog';

interface ScenarioFormData {
  name: string;
  description: string;
  is_default: boolean;
  parameters: ProjectionParameterCreate[];
}

interface ScenarioFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  formData: ScenarioFormData;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSwitchChange: (checked: boolean) => void;
  onParametersChange: (parameters: ProjectionParameterCreate[]) => void;
  onSubmit: () => void;
  submitLabel: string;
  idPrefix?: string;
  isSaving?: boolean;
  error?: string | null;
}

const ScenarioFormDialog: React.FC<ScenarioFormDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  formData,
  onInputChange,
  onSwitchChange,
  onParametersChange,
  onSubmit,
  submitLabel,
  idPrefix = '',
  isSaving = false,
  error,
}) => {
  const [parametersValid, setParametersValid] = useState(true);
  const nameId = `${idPrefix}name`;
  const descriptionId = `${idPrefix}description`;
  const isDefaultId = `${idPrefix}is_default`;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} description={description} isBusy={isSaving}>
      <form onSubmit={event => { event.preventDefault(); if (parametersValid && formData.name.trim() && !isSaving) onSubmit(); }}>
      <fieldset disabled={isSaving} className="space-y-4 py-4 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
          <label htmlFor={nameId} className="sm:text-right text-sm font-medium text-gray-700 dark:text-gray-300">
            Name
          </label>
          <input
            id={nameId}
            name="name"
            required
            maxLength={100}
            pattern=".*\\S.*"
            value={formData.name}
            onChange={onInputChange}
            className="sm:col-span-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
          <label htmlFor={descriptionId} className="sm:text-right text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            id={descriptionId}
            name="description"
            value={formData.description}
            onChange={onInputChange}
            rows={3}
            className="sm:col-span-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
          <label htmlFor={isDefaultId} className="sm:text-right text-sm font-medium text-gray-700 dark:text-gray-300">
            Default Scenario
          </label>
          <div className="flex items-center space-x-2 sm:col-span-3">
            <input
              type="checkbox"
              id={isDefaultId}
              checked={formData.is_default}
              onChange={e => onSwitchChange(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor={isDefaultId} className="text-sm text-gray-700 dark:text-gray-300">
              Make this a default scenario
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Parameters</label>
          <ParameterEditor parameters={formData.parameters} onChange={onParametersChange} onValidityChange={setParametersValid} />
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      {!parametersValid && <p role="status" className="text-sm text-red-700 dark:text-red-300">Correct the highlighted assumptions before saving.</p>}
      <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 mt-6 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          disabled={isSaving}
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || !parametersValid || !formData.name.trim()}
          className="min-h-11 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving scenario…' : submitLabel}
        </button>
      </div>
      </form>
    </Dialog>
  );
};

export default ScenarioFormDialog;
