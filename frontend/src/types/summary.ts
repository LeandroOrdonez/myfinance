export interface DataPeriod {
  start_date: string;
  end_date: string;
}

export interface AccountOverview {
  total_balance: number;
  net_worth: number;
  data_period: DataPeriod;
  last_transaction_date?: string;
}

export interface TransactionVolume {
  month: string;
  amount: number;
  count: number;
}

export interface TransactionSummary {
  total_count: number;
  monthly_volume: TransactionVolume[];
  average_transaction_amount: number;
  top_categories: Array<{ category: string; amount: number }>;
  recent_large_income: Array<{ description: string; amount: number; date: string }>;
  recent_large_expenses: Array<{ description: string; amount: number; date: string }>;
}

export interface IncomeTrend {
  month: string;
  amount: number;
}

export interface IncomeAnalysis {
  monthly_trends: IncomeTrend[];
  primary_sources: Array<{ source: string; amount: number }>;
  income_stability: number;
  yoy_growth?: number;
}

export interface ExpenseTrend {
  month: string;
  amount: number;
}

export interface ExpenseAnalysis {
  monthly_trends: ExpenseTrend[];
  top_categories: Array<{ category: string; amount: number }>;
  essential_vs_discretionary: Record<string, number>;
  outliers: Array<{ description: string; amount: number; reason?: string }>;
  average_monthly_expenses: number;
}

export interface MetricScore {
  score: number;
  value: number;
  status: string;
}

export interface FinancialHealthSummary {
  overall_score: number;
  metrics: Record<string, MetricScore>;
  top_recommendations: Array<{ title: string; description: string; priority: number }>;
}

export interface SavingsInvestmentSummary {
  monthly_savings_rate: number;
  investment_portfolio_value: number;
  savings_growth_trend: Array<{ month: string; net_savings: number; cumulative_savings: number }>;
  investment_allocation: Array<{ category: string; amount: number }>;
}

export interface ProjectionHighlight {
  horizon_months: number;
  projected_net_worth: number;
  projected_savings: number;
}

export interface ProjectionsSummary {
  six_month_outlook: ProjectionHighlight;
  one_year_outlook: ProjectionHighlight;
  key_assumptions: Record<string, any>;
}

export interface FinancialSummaryResponse {
  generated_at: string;
  data_period: DataPeriod;
  account_overview: AccountOverview;
  transaction_summary: TransactionSummary;
  income_analysis: IncomeAnalysis;
  expense_analysis: ExpenseAnalysis;
  financial_health: FinancialHealthSummary;
  savings_investment: SavingsInvestmentSummary;
  projections_summary: ProjectionsSummary;
  narrative_summary: string;
}
