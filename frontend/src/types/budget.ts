import { ExpenseCategory } from './transaction';

export type BudgetStatus = 'on_track' | 'warning' | 'over';

export interface Budget {
  id: number;
  category: ExpenseCategory | string;
  limit_amount: number;
  period: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetCreate {
  category: ExpenseCategory | string;
  limit_amount: number;
  period?: string;
}

export interface BudgetUpdate {
  limit_amount?: number;
  is_active?: boolean;
}

export interface BudgetProgress {
  category: ExpenseCategory | string;
  limit_amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
  month: string;
}

export interface BudgetSuggestion {
  category: ExpenseCategory | string;
  suggested_limit: number;
  percentile: number;
  months_analyzed: number;
  monthly_history: number[];
}
