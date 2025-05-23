import axios from 'axios';
import { 
  Transaction, 
  ExpenseCategory, 
  IncomeCategory, 
  TransactionType,
  SortParams
} from '../types/transaction';
import { API_BASE_URL } from '../config';

export const transactionService = {
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
  }
}; 