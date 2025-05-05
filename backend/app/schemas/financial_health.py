from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional, List
from ..models.statistics import StatisticsPeriod

class FinancialHealthScoreBase(BaseModel):
    period: StatisticsPeriod
    date: Optional[date] = None

class FinancialHealthScoreOut(FinancialHealthScoreBase):
    model_config = ConfigDict(from_attributes=True)
    # Override date to accept actual date values
    date: date
    id: int
    overall_score: float
    savings_rate: float
    expense_ratio: float
    budget_adherence: float
    dti_ratio: float
    emergency_fund_ratio: float
    spending_stability: float

class RecommendationBase(BaseModel):
    metric: str
    description: str

class RecommendationOut(RecommendationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    progress: float
    created_at: datetime

class RecommendationProgressUpdate(BaseModel):
    progress: float

class HealthGoalBase(BaseModel):
    metric: str
    target_value: float

class HealthGoalCreate(HealthGoalBase):
    pass

class HealthGoalOut(HealthGoalBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
