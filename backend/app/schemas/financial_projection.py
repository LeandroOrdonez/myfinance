from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import date
from enum import Enum


class ParamType(str, Enum):
    PERCENTAGE = "percentage"
    AMOUNT = "amount"
    MONTHS = "months"
    INTEGER = "integer"
    BOOLEAN = "boolean"


# Validation bounds for projection parameters
PARAMETER_BOUNDS = {
    "income_growth_rate": {"min": -0.80, "max": 0.80},  # -80% to +80% annual
    "essential_expenses_growth_rate": {"min": -0.80, "max": 0.80},
    "discretionary_expenses_growth_rate": {"min": -0.80, "max": 0.80},
    "investment_rate": {"min": 0.0, "max": 0.90},  # 0% to 90% of income
    "inflation_rate": {"min": -0.10, "max": 0.30},  # -10% to +30%
    "investment_return_rate": {"min": -0.80, "max": 0.80},  # -80% to +80%
    "emergency_fund_target": {"min": 0.0, "max": 36.0},  # 0 to 36 months
    "holdings_market_value": {"min": 0.0, "max": 1e12},  # 0 to 1 trillion
}


class ProjectionParameterBase(BaseModel):
    param_name: str
    param_value: float
    param_type: ParamType
    
    @field_validator('param_value')
    @classmethod
    def validate_param_value(cls, v: float, info) -> float:
        """Validate parameter value is within acceptable bounds"""
        param_name = info.data.get('param_name')
        if param_name and param_name in PARAMETER_BOUNDS:
            bounds = PARAMETER_BOUNDS[param_name]
            if v < bounds["min"] or v > bounds["max"]:
                raise ValueError(
                    f"Parameter '{param_name}' value {v} is out of bounds. "
                    f"Must be between {bounds['min']} and {bounds['max']}."
                )
        return v


class ProjectionParameterCreate(ProjectionParameterBase):
    pass


class ProjectionParameter(ProjectionParameterBase):
    id: int
    scenario_id: int
    
    class Config:
        orm_mode = True


class ProjectionScenarioBase(BaseModel):
    name: str
    description: str
    is_default: bool = False
    is_base_scenario: bool = False


class ProjectionScenarioCreate(ProjectionScenarioBase):
    parameters: List[ProjectionParameterCreate]


class ProjectionScenario(ProjectionScenarioBase):
    id: int
    created_at: date
    user_id: Optional[int] = None
    
    class Config:
        orm_mode = True


class ProjectionScenarioDetail(ProjectionScenario):
    parameters: List[ProjectionParameter] = []


class ProjectionResultBase(BaseModel):
    month: int
    year: int
    projected_income: float
    projected_expenses: float
    projected_investments: float
    projected_savings: float
    projected_net_worth: float


class ProjectionResultCreate(ProjectionResultBase):
    scenario_id: int


class ProjectionResult(ProjectionResultBase):
    id: int
    scenario_id: int
    created_at: date
    
    class Config:
        orm_mode = True


class ProjectionTimeseries(BaseModel):
    dates: List[str]
    projected_income: List[float]
    projected_expenses: List[float]
    projected_investments: List[float]
    projected_savings: List[float]
    projected_net_worth: List[float]
    # Real (inflation-adjusted) values in today's purchasing power
    real_projected_income: List[float] = []
    real_projected_expenses: List[float] = []
    real_projected_investments: List[float] = []
    real_projected_savings: List[float] = []
    real_projected_net_worth: List[float] = []
    inflation_rate: float = 0.02


class ScenarioComparison(BaseModel):
    scenario_names: List[str]
    dates: List[str]
    net_worth_series: Dict[str, List[float]]
    savings_series: Dict[str, List[float]]
    investment_series: Dict[str, List[float]]
    # Real (inflation-adjusted) series
    real_net_worth_series: Dict[str, List[float]] = {}
    real_savings_series: Dict[str, List[float]] = {}
    real_investment_series: Dict[str, List[float]] = {}
    inflation_rates: Dict[str, float] = {}
