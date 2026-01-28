import React from 'react';
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
}) => {
  const nameId = `${idPrefix}name`;
  const descriptionId = `${idPrefix}description`;
  const isDefaultId = `${idPrefix}is_default`;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} description={description}>
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor={nameId} className="text-right text-sm font-medium text-gray-700 dark:text-gray-300">
            Name
          </label>
          <input
            id={nameId}
            name="name"
            value={formData.name}
            onChange={onInputChange}
            className="col-span-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor={descriptionId} className="text-right text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            id={descriptionId}
            name="description"
            value={formData.description}
            onChange={onInputChange}
            rows={3}
            className="col-span-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor={isDefaultId} className="text-right text-sm font-medium text-gray-700 dark:text-gray-300">
            Default Scenario
          </label>
          <div className="flex items-center space-x-2 col-span-3">
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                id={isDefaultId}
                checked={formData.is_default}
                onChange={(e) => onSwitchChange(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-11 h-6 rounded-full transition ${formData.is_default ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                onClick={() => onSwitchChange(!formData.is_default)}
              >
                <div
                  className={`transform transition-transform duration-200 ease-in-out h-5 w-5 rounded-full bg-white shadow-md ${formData.is_default ? 'translate-x-6' : 'translate-x-1'} mt-0.5`}
                />
              </div>
            </div>
            <label htmlFor={isDefaultId} className="text-sm text-gray-700 dark:text-gray-300">
              Make this a default scenario
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Parameters</label>
          <ParameterEditor parameters={formData.parameters} onChange={onParametersChange} />
        </div>
      </div>

      <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
        >
          {submitLabel}
        </button>
      </div>
    </Dialog>
  );
};

export default ScenarioFormDialog;
