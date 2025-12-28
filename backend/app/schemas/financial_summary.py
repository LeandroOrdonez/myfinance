from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date, datetime

class DataPeriod(BaseModel):
    start_date: date
    end_date: date

class AccountOverview(BaseModel):
    total_balance: float
    net_worth: float
    data_period: DataPeriod
    last_transaction_date: Optional[date]

class TransactionVolume(BaseModel):
    month: str
    amount: float
    count: int

class TransactionSummary(BaseModel):
    total_count: int
    monthly_volume: List[TransactionVolume]
    average_transaction_amount: float
    top_categories: List[Dict[str, Any]]
    recent_large_income: List[Dict[str, Any]]
    recent_large_expenses: List[Dict[str, Any]]

class IncomeTrend(BaseModel):
    month: str
    amount: float

class IncomeAnalysis(BaseModel):
    monthly_trends: List[IncomeTrend]
    primary_sources: List[Dict[str, Any]]
    income_stability: float
    yoy_growth: Optional[float]

class ExpenseTrend(BaseModel):
    month: str
    amount: float

class ExpenseAnalysis(BaseModel):
    monthly_trends: List[ExpenseTrend]
    top_categories: List[Dict[str, Any]]
    essential_vs_discretionary: Dict[str, float]
    outliers: List[Dict[str, Any]]
    average_monthly_expenses: float

class MetricScore(BaseModel):
    score: float
    value: float
    status: str  # e.g., "excellent", "good", "concerning"

class FinancialHealthSummary(BaseModel):
    overall_score: float
    metrics: Dict[str, MetricScore]
    top_recommendations: List[Dict[str, Any]]

class SavingsInvestmentSummary(BaseModel):
    monthly_savings_rate: float
    investment_portfolio_value: float
    savings_growth_trend: List[Dict[str, Any]]
    investment_allocation: List[Dict[str, Any]]

class ProjectionHighlight(BaseModel):
    horizon_months: int
    projected_net_worth: float
    projected_savings: float

class ProjectionsSummary(BaseModel):
    six_month_outlook: ProjectionHighlight
    one_year_outlook: ProjectionHighlight
    key_assumptions: Dict[str, Any]

class FinancialSummaryResponse(BaseModel):
    generated_at: datetime
    data_period: DataPeriod
    account_overview: AccountOverview
    transaction_summary: TransactionSummary
    income_analysis: IncomeAnalysis
    expense_analysis: ExpenseAnalysis
    financial_health: FinancialHealthSummary
    savings_investment: SavingsInvestmentSummary
    projections_summary: ProjectionsSummary
    narrative_summary: str
