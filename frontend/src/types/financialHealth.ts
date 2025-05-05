export interface FinancialHealthScore {
  id: number;
  period: 'MONTHLY' | 'YEARLY';
  date: string;
  overall_score: number;
  savings_rate: number;
  expense_ratio: number;
  budget_adherence: number;
  dti_ratio: number;
  emergency_fund_ratio: number;
  spending_stability: number;
}
