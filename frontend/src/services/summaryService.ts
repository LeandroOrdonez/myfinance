import axios from 'axios';
import { FinancialSummaryResponse } from '../types/summary';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const summaryService = {
  getSummary: async (): Promise<FinancialSummaryResponse> => {
    const response = await axios.get(`${API_URL}/financial-summary/`);
    return response.data;
  },
};
