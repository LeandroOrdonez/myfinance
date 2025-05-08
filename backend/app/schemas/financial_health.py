from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date


class FinancialHealthBase(BaseModel):
    date: date
    overall_score: float
    savings_rate_score: float
    expense_ratio_score: float
    budget_adherence_score: float
    debt_to_income_score: float
    emergency_fund_score: float
    spending_stability_score: float
    investment_rate_score: float
    
    # Raw metrics
    savings_rate: float
    expense_ratio: float
    budget_adherence: float
    debt_to_income: float
    emergency_fund_months: float
    spending_stability: float
    investment_rate: float
    
    # Recommendations
    recommendations: Optional[List[Dict[str, Any]]] = None


class FinancialHealthCreate(FinancialHealthBase):
    pass


class FinancialHealth(FinancialHealthBase):
    id: int
    
    class Config:
        orm_mode = True


class FinancialHealthHistory(BaseModel):
    dates: List[date]
    overall_scores: List[float]
    savings_rate_scores: List[float]
    expense_ratio_scores: List[float]
    budget_adherence_scores: List[float]
    debt_to_income_scores: List[float]
    emergency_fund_scores: List[float]
    spending_stability_scores: List[float]
    investment_rate_scores: List[float]


class RecommendationBase(BaseModel):
    title: str
    description: str
    category: str
    impact_area: str
    priority: int
    estimated_score_improvement: float


class RecommendationCreate(RecommendationBase):
    pass


class Recommendation(RecommendationBase):
    id: int
    date_created: date
    is_completed: bool
    date_completed: Optional[date] = None
    
    class Config:
        orm_mode = True


class RecommendationUpdate(BaseModel):
    is_completed: bool
    date_completed: Optional[date] = None
