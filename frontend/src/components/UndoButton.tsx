import React, { useState } from 'react';
import * as Toast from '@radix-ui/react-toast';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

interface UndoButtonProps {
  onUndo: () => Promise<boolean>;
  canUndo: boolean;
}

export const UndoButton: React.FC<UndoButtonProps> = ({ onUndo, canUndo }) => {
  const [isUndoing, setIsUndoing] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const handleUndo = async () => {
    if (!canUndo || isUndoing) return;
    
    setIsUndoing(true);
    try {
      const success = await onUndo();
      
      if (success) {
        setToastMessage('Action successfully undone');
        setToastType('success');
      } else {
        setToastMessage('Failed to undo the action');
        setToastType('error');
      }
      
      setToastOpen(true);
    } catch (error) {
      setToastMessage('An error occurred while undoing');
      setToastType('error');
      setToastOpen(true);
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={handleUndo}
        disabled={!canUndo || isUndoing}
        className={`inline-flex items-center justify-center rounded-md py-2 px-3 text-sm font-medium transition-colors
          ${canUndo 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          } ${isUndoing ? 'opacity-70 cursor-wait' : ''}
        `}
        title="Undo last action"
        aria-label="Undo last action"
      >
        <ArrowUturnLeftIcon className="h-4 w-4 mr-1" />
        <span>Undo</span>
      </button>

      <Toast.Provider swipeDirection="right">
        <Toast.Root
          className={`
            fixed bottom-4 right-4 z-50 rounded-md shadow-lg p-4 
            ${toastType === 'success' ? 'bg-green-600' : 'bg-red-600'} 
            text-white flex items-center
          `}
          open={toastOpen}
          onOpenChange={setToastOpen}
          duration={3000}
        >
          <Toast.Title className="font-medium">
            {toastMessage}
          </Toast.Title>
        </Toast.Root>
        <Toast.Viewport />
      </Toast.Provider>
    </div>
  );
};