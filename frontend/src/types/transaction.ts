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
  total_amount: number;
  transaction_count: number;
  transaction_type: TransactionType;
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