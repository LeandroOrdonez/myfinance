import { useState } from 'react';
import { UndoableAction, ActionType, Transaction, ExpenseCategory, IncomeCategory, TransactionType } from '../types/transaction';
import { transactionService } from '../services/transactionService';

export const useActionHistory = () => {
  const [actionHistory, setActionHistory] = useState<UndoableAction[]>([]);

  const addAction = (action: UndoableAction) => {
    setActionHistory(prev => [...prev, action]);
  };

  const clearHistory = () => {
    setActionHistory([]);
  };

  const undoLastAction = async (): Promise<boolean> => {
    if (actionHistory.length === 0) return false;
    
    const lastAction = actionHistory[actionHistory.length - 1];
    let success = false;

    try {
      switch (lastAction.type) {
        case ActionType.DELETE_TRANSACTION:
          // Restore deleted transaction
          success = await restoreTransaction(lastAction.transaction);
          break;
        
        case ActionType.UPDATE_CATEGORY:
          // Restore old category
          success = await restoreCategory(
            lastAction.transactionId,
            lastAction.oldCategory,
            lastAction.transactionType
          );
          break;
      }

      if (success) {
        // Remove the action from history
        setActionHistory(prev => prev.slice(0, -1));
      }

      return success;
    } catch (error) {
      console.error('Failed to undo action:', error);
      return false;
    }
  };

  const restoreTransaction = async (transaction: Transaction): Promise<boolean> => {
    try {
      // We need to recreate the transaction via API
      await transactionService.restoreTransaction(transaction);
      return true;
    } catch (error) {
      console.error('Failed to restore transaction:', error);
      return false;
    }
  };

  const restoreCategory = async (
    transactionId: number,
    oldCategory: ExpenseCategory | IncomeCategory | undefined,
    transactionType: TransactionType
  ): Promise<boolean> => {
    try {
      if (!oldCategory) {
        // Can't restore to undefined category
        return false;
      }

      await transactionService.updateCategory(transactionId, oldCategory, transactionType);
      return true;
    } catch (error) {
      console.error('Failed to restore category:', error);
      return false;
    }
  };

  const canUndo = actionHistory.length > 0;

  return {
    addAction,
    undoLastAction,
    clearHistory,
    canUndo
  };
};