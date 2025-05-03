import axios from 'axios';
import { 
  Transaction, 
  ExpenseCategory, 
  IncomeCategory, 
  TransactionType,
  SortParams,
  SuggestCategoryResponse,
  WeekdayDistribution
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
    sortParams: SortParams,
    filters: {
      search?: string;
      category?: string;
      start_date?: string;
      end_date?: string;
    } = {}
  ): Promise<{
    items: Transaction[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> => {
    const params: Record<string, any> = {
      page,
      page_size: pageSize,
      sort_field: sortParams.field,
      sort_direction: sortParams.direction,
      ...filters
    };
    const response = await axios.get(`${API_BASE_URL}/transactions/`, { params });
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
    period: 'monthly' | 'yearly' | 'all_time' = 'monthly',
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
    const response = await axios.delete(`${API_BASE_URL}/transactions/${transactionId}`);

    if (!response.data) {
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

  getStatisticsTimeseries: async (start_date?: string, end_date?: string) => {
    const params: Record<string, string> = {};
    if (start_date) params.start_date = start_date;
    if (end_date) params.end_date = end_date;
    const response = await axios.get(`${API_BASE_URL}/statistics/timeseries`, { params });
    return response.data;
  },

  suggestCategory: async (
    description: string,
    amount: number,
    transactionType: TransactionType
  ): Promise<SuggestCategoryResponse> => {
    const response = await axios.post(`${API_BASE_URL}/suggestions/category`, {
      description,
      amount,
      transaction_type: transactionType
    });
    return response.data;
  },

  getWeekdayDistribution: async (
    transactionType?: TransactionType,
    startDate?: string,
    endDate?: string
  ): Promise<WeekdayDistribution> => {
    const params: Record<string, string> = {};
    if (transactionType) params.transaction_type = transactionType;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const response = await axios.get(`${API_BASE_URL}/statistics/weekday-distribution`, { params });
    return response.data;
  },
}; 