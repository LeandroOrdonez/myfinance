import axios from 'axios';
import {
  Budget,
  BudgetCreate,
  BudgetUpdate,
  BudgetProgress,
  BudgetSuggestion,
} from '../types/budget';
import { API_BASE_URL } from '../config';

export const budgetService = {
  getBudgets: async (): Promise<Budget[]> => {
    const response = await axios.get(`${API_BASE_URL}/budgets/`);
    return response.data;
  },

  createBudget: async (budget: BudgetCreate): Promise<Budget> => {
    const response = await axios.post(`${API_BASE_URL}/budgets/`, budget);
    return response.data;
  },

  updateBudget: async (id: number, budget: BudgetUpdate): Promise<Budget> => {
    const response = await axios.put(`${API_BASE_URL}/budgets/${id}`, budget);
    return response.data;
  },

  deleteBudget: async (id: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/budgets/${id}`);
  },

  getProgress: async (targetDate?: string): Promise<BudgetProgress[]> => {
    const params: Record<string, string> = {};
    if (targetDate) params.target_date = targetDate;
    const response = await axios.get(`${API_BASE_URL}/budgets/progress`, { params });
    return response.data;
  },

  getSuggestion: async (
    category: string,
    percentile?: number,
    months?: number
  ): Promise<BudgetSuggestion> => {
    const params: Record<string, string | number> = { category };
    if (percentile !== undefined) params.percentile = percentile;
    if (months !== undefined) params.months = months;
    const response = await axios.get(`${API_BASE_URL}/budgets/suggestion`, { params });
    return response.data;
  },
};
