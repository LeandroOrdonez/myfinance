from pydantic import BaseModel, Field, RootModel
from typing import List, Optional, Dict, Any, Union
from datetime import date
from enum import Enum
from ..models.transaction import TransactionType, ExpenseType
from ..models.statistics import StatisticsPeriod

# Models for get_statistics_timeseries
class FinancialStatisticsResponse(BaseModel):
    id: int
    period: str
    date: Optional[str] = None
    
    # Period-specific metrics
    period_income: float
    period_expenses: float
    period_net_savings: float
    savings_rate: float
    
    # Cumulative metrics
    total_income: float
    total_expenses: float
    total_net_savings: float
    
    # Transaction counts
    income_count: int
    expense_count: int
    
    # Averages
    average_income: float
    average_expense: float
    
    # Yearly metrics
    yearly_income: float
    yearly_expenses: float
    
    model_config = {
        "from_attributes": True
    }

# Models for get_category_statistics_timeseries
class CategoryStatisticsResponse(BaseModel):
    id: int
    period: str
    date: str
    
    # Category identification
    category_name: str
    transaction_type: str
    expense_type: Optional[str] = None
    
    # Period-specific metrics
    period_amount: float
    period_transaction_count: int
    period_percentage: float
    
    # Cumulative metrics
    total_amount: float
    total_transaction_count: int
    
    # Averages
    average_transaction_amount: float
    
    # Yearly metrics
    yearly_amount: float
    yearly_transaction_count: int
    
    model_config = {
        "from_attributes": True
    }

# Models for get_expense_type_statistics_timeseries
class ExpenseTypeTimeseriesItem(BaseModel):
    date: str = Field(..., description="Date in ISO format (YYYY-MM-DD)")
    expense_type: str = Field(..., description="Either 'essential' or 'discretionary'")
    period_amount: float = Field(..., description="Total amount for this expense type in the time period")
    period_transaction_count: int = Field(..., description="Number of transactions for this expense type in the time period")

# Use RootModel for a list response
class ExpenseTypeTimeseriesResponse(RootModel):
    root: List[ExpenseTypeTimeseriesItem]

# Models for get_category_averages
class CategoryAverageItem(BaseModel):
    category_name: str = Field(..., description="Category name")
    transaction_type: str = Field(..., description="Transaction type (EXPENSE or INCOME)")
    expense_type: Optional[str] = Field(None, description="Expense type (Essential or Discretionary) for expenses")
    average_amount: float = Field(..., description="Average monthly amount for this category in the time period")
    total_amount: float = Field(..., description="Total amount for this category in the time period")
    transaction_count: int = Field(..., description="Number of transactions for this category in the time period")
    average_transaction_amount: float = Field(..., description="Average amount per transaction")
    percentage: float = Field(..., description="Percentage of total expenses/income")

class CategoryAveragesResponse(BaseModel):
    start_date: str = Field(..., description="Start date of the period")
    end_date: str = Field(..., description="End date of the period")
    months_count: int = Field(..., description="Number of months in the period")
    categories: List[CategoryAverageItem] = Field(..., description="List of category averages")
