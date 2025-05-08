export enum TransactionType {
  INCOME = "Income",
  EXPENSE = "Expense"
}

export enum ExpenseCategory {
  HOUSING = "Housing",
  UTILITIES = "Utilities",
  GROCERIES = "Groceries",
  EATING_OUT = "Eating Out",
  TRANSPORTATION = "Transportation",
  INSURANCE = "Insurance",
  DEBT = "Debt",
  INVESTMENTS = "Investments",
  PERSONAL = "Personal",
  GIFTS = "Gifts",
  DONATIONS = "Donations",
  EDUCATION = "Education",
  TRAVEL = "Travel",
  ENTERTAINMENT = "Entertainment",
  OTHERS = "Others"
}

export enum IncomeCategory {
  SALARY = "Salary",
  INVESTMENTS = "Investment Income",
  BUSINESS = "Business Income",
  RENTAL = "Rental Income",
  FREELANCE = "Freelance Income",
  PENSION = "Pension",
  BENEFITS = "Benefits",
  GIFTS = "Gifts Received",
  REFUNDS = "Refunds",
  OTHER = "Other Income"
}

export interface Transaction {
  id: number;
  account_number: string;
  transaction_date: string;
  amount: number;
  currency: string;
  description: string;
  counterparty_name?: string;
  counterparty_account?: string;
  transaction_type: TransactionType;
  expense_category?: ExpenseCategory;
  income_category?: IncomeCategory;
  source_bank: string;
}

export interface CategoryStatistics {
  category: string;
  transaction_type: TransactionType;
  period?: string;
  date?: string;
  
  // For backward compatibility
  total_amount: number;
  transaction_count: number;
  
  // Period-specific metrics
  period_amount?: number;
  period_transaction_count?: number;
  period_percentage?: number;
  
  // Cumulative metrics
  total_amount_cumulative?: number;
  total_transaction_count?: number;
  
  // Averages
  average_transaction_amount?: number;
  
  // Yearly metrics
  yearly_amount?: number;
  yearly_transaction_count?: number;
}

export interface CategorySuggestion {
  category: string;
  confidence: number;
}

export interface SuggestCategoryResponse {
  suggestions: CategorySuggestion[];
}

export interface SortParams {
  field: 'date' | 'description' | 'amount' | 'type';
  direction: 'asc' | 'desc';
}

export enum ActionType {
  DELETE_TRANSACTION = 'DELETE_TRANSACTION',
  UPDATE_CATEGORY = 'UPDATE_CATEGORY'
}

export interface DeleteTransactionAction {
  type: ActionType.DELETE_TRANSACTION;
  transaction: Transaction;
}

export interface UpdateCategoryAction {
  type: ActionType.UPDATE_CATEGORY;
  transactionId: number;
  oldCategory: ExpenseCategory | IncomeCategory | undefined;
  newCategory: ExpenseCategory | IncomeCategory;
  transactionType: TransactionType;
}

export type UndoableAction = DeleteTransactionAction | UpdateCategoryAction;

export interface WeekdayStats {
  count: number;
  total: number;
  average: number;
  median: number;
  min: number;
  max: number;
}

export interface WeekdayTypeStats {
  expense: WeekdayStats;
  income: WeekdayStats;
}

export interface WeekdayDistribution {
  weekdays: {
    [key: string]: WeekdayTypeStats;
  };
  transaction_count: number;
}

// Financial Health Types
export interface FinancialHealthScore {
  id: number;
  date: string;
  overall_score: number;
  savings_rate_score: number;
  expense_ratio_score: number;
  budget_adherence_score: number;
  debt_to_income_score: number;
  emergency_fund_score: number;
  spending_stability_score: number;
  investment_rate_score: number;
  
  // Raw metrics
  savings_rate: number;
  expense_ratio: number;
  budget_adherence: number;
  debt_to_income: number;
  emergency_fund_months: number;
  spending_stability: number;
  investment_rate: number;
  
  // Recommendations
  recommendations?: RecommendationData[];
}

export interface FinancialHealthHistory {
  dates: string[];
  overall_scores: number[];
  savings_rate_scores: number[];
  expense_ratio_scores: number[];
  budget_adherence_scores: number[];
  debt_to_income_scores: number[];
  emergency_fund_scores: number[];
  spending_stability_scores: number[];
  investment_rate_scores: number[];
}

export interface RecommendationData {
  title: string;
  description: string;
  category: string;
  impact_area: string;
  priority: number;
  estimated_score_improvement: number;
}

export interface Recommendation {
  id: number;
  title: string;
  description: string;
  category: string;
  impact_area: string;
  priority: number;
  estimated_score_improvement: number;
  is_completed: boolean;
  date_completed: string | null;
  date_created: string;
}