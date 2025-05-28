from sqlalchemy import Column, Integer, Float, String, Date, ForeignKey, JSON, Boolean, Enum
from sqlalchemy.orm import relationship
from ..database import Base
import enum
from datetime import date
from typing import Optional


class ParamType(str, enum.Enum):
    PERCENTAGE = "percentage"
    AMOUNT = "amount"
    MONTHS = "months"
    INTEGER = "integer"
    BOOLEAN = "boolean"


class ProjectionScenario(Base):
    __tablename__ = "projection_scenarios"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(String(1000), nullable=False)
    created_at = Column(Date, nullable=False, default=date.today)
    is_default = Column(Boolean, default=False)
    is_base_scenario = Column(Boolean, default=False)  # Identifies the base scenario for recomputation
    user_id = Column(Integer, nullable=True)  # For future multi-user support
    
    # Relationships
    parameters = relationship("ProjectionParameter", back_populates="scenario", cascade="all, delete-orphan")
    results = relationship("ProjectionResult", back_populates="scenario", cascade="all, delete-orphan")


class ProjectionParameter(Base):
    __tablename__ = "projection_parameters"
    
    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("projection_scenarios.id"), nullable=False)
    param_name = Column(String(100), nullable=False)
    param_value = Column(Float, nullable=False)
    param_type = Column(Enum(ParamType), nullable=False)
    
    # Relationships
    scenario = relationship("ProjectionScenario", back_populates="parameters")


class ProjectionResult(Base):
    __tablename__ = "projection_results"
    
    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("projection_scenarios.id"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    projected_income = Column(Float, nullable=False)
    projected_expenses = Column(Float, nullable=False)
    projected_investments = Column(Float, nullable=False)
    projected_savings = Column(Float, nullable=False)
    projected_net_worth = Column(Float, nullable=False)
    created_at = Column(Date, nullable=False, default=date.today)
    
    # Relationships
    scenario = relationship("ProjectionScenario", back_populates="results")
