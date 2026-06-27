from pydantic import BaseModel, validator
from typing import List, Optional
from datetime import datetime
from ..models.transaction import ExpenseCategory


class BudgetBase(BaseModel):
    category: str
    limit_amount: float
    period: str = "monthly"

    @validator('category')
    def validate_category(cls, v):
        valid_categories = {c.value for c in ExpenseCategory}
        if v not in valid_categories:
            raise ValueError(f"Invalid category: {v}")
        return v

    @validator('limit_amount')
    def validate_limit_amount(cls, v):
        if v <= 0:
            raise ValueError("limit_amount must be greater than 0")
        return v


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    limit_amount: Optional[float] = None
    is_active: Optional[bool] = None

    @validator('limit_amount')
    def validate_limit_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError("limit_amount must be greater than 0")
        return v


class Budget(BudgetBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class BudgetProgress(BaseModel):
    category: str
    limit_amount: float
    spent: float
    remaining: float
    percentage: float
    status: str  # "on_track" | "warning" | "over"
    month: str  # "YYYY-MM"


class BudgetSuggestion(BaseModel):
    category: str
    suggested_limit: float
    percentile: float
    months_analyzed: int
    monthly_history: List[float]
