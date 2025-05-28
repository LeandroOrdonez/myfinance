from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date
from enum import Enum


class ParamType(str, Enum):
    PERCENTAGE = "percentage"
    AMOUNT = "amount"
    MONTHS = "months"
    INTEGER = "integer"
    BOOLEAN = "boolean"


class ProjectionParameterBase(BaseModel):
    param_name: str
    param_value: float
    param_type: ParamType


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


class ScenarioComparison(BaseModel):
    scenario_names: List[str]
    dates: List[str]
    net_worth_series: Dict[str, List[float]]
    savings_series: Dict[str, List[float]]
    investment_series: Dict[str, List[float]]
