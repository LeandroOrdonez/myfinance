import axios from 'axios';
import { 
  Transaction, 
  ExpenseCategory, 
  IncomeCategory, 
  TransactionType,
  SortParams,
  SuggestCategoryResponse
} from '../types/transaction';

const API_BASE_URL = 'http://localhost:8000';

export const api = {
  uploadCSV: async (file: File): Promise<Transaction[]> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(`${API_BASE_URL}/upload/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getTransactions: async (
    page: number, 
    pageSize: number,
    sortParams: SortParams
  ): Promise<{
    items: Transaction[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> => {
    const response = await axios.get(`${API_BASE_URL}/transactions/`, {
      params: {
        page,
        page_size: pageSize,
        sort_field: sortParams.field,
        sort_direction: sortParams.direction
      }
    });
    return response.data;
  },

  updateCategory: async (
    transactionId: number,
    category: ExpenseCategory | IncomeCategory,
    transactionType: TransactionType
  ): Promise<Transaction> => {
    const response = await axios.patch(
      `${API_BASE_URL}/transactions/${transactionId}/category`,
      null,
      {
        params: {
          category,
          transaction_type: transactionType
        }
      }
    );
    return response.data;
  },

  getCategoryStatistics: async (
    period: 'daily' | 'monthly' | 'all_time' = 'monthly',
    date?: string
  ) => {
    const params: Record<string, string> = { period };
    if (date) {
      params.date = date;
    }
    
    const response = await axios.get(`${API_BASE_URL}/statistics/by-category`, {
      params
    });
    return response.data;
  },

  async deleteTransaction(transactionId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete transaction');
    }
  },
  
  async restoreTransaction(transaction: Transaction): Promise<Transaction> {
    const response = await axios.post(
      `${API_BASE_URL}/transactions/restore`,
      transaction
    );
    
    if (!response.data) {
      throw new Error('Failed to restore transaction');
    }
    
    return response.data;
  },

  getStatisticsOverview: async () => {
    const response = await axios.get(`${API_BASE_URL}/statistics/overview`);
    return response.data;
  },

  initializeStatistics: async () => {
    const response = await axios.post(`${API_BASE_URL}/statistics/initialize`);
    return response.data;
  },

  getStatisticsTimeseries: async () => {
    const response = await axios.get(`${API_BASE_URL}/statistics/timeseries`);
    return response.data;
  },

  suggestCategory: async (
    description: string,
    amount: number,
    transactionType: TransactionType
  ): Promise<SuggestCategoryResponse> => {
    const response = await axios.post(`${API_BASE_URL}/suggest-category`, {
      description,
      amount,
      transaction_type: transactionType
    });
    return response.data;
  },
}; 