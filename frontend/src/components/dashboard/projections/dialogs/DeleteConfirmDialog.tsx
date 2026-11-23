import React from 'react';
import { ProjectionScenario } from '../../../../types/projections';
import Dialog from './Dialog';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: ProjectionScenario | null;
  onConfirm: () => void;
  isDeleting?: boolean;
  error?: string | null;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  scenario,
  onConfirm,
  isDeleting = false,
  error,
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Scenario"
      description="Are you sure you want to delete this scenario? This action cannot be undone."
      maxWidth="md"
      isBusy={isDeleting}
    >
      {scenario && (
        <div className="py-4 space-y-2 text-sm">
          <p>
            <span className="font-medium">Name:</span> {scenario.name}
          </p>
          <p>
            <span className="font-medium">Description:</span> {scenario.description}
          </p>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          disabled={isDeleting}
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isDeleting}
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-md transition-colors"
        >
          {isDeleting ? 'Deleting…' : 'Delete scenario'}
        </button>
      </div>
    </Dialog>
  );
};

export default DeleteConfirmDialog;
