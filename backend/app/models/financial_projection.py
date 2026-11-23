from sqlalchemy import Column, Integer, Float, String, Date, DateTime, ForeignKey, JSON, Boolean, Enum, UniqueConstraint
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
    calculation = relationship("ProjectionCalculation", back_populates="scenario", cascade="all, delete-orphan", uselist=False)


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


class ProjectionCalculation(Base):
    __tablename__ = "projection_calculations"

    scenario_id = Column(Integer, ForeignKey("projection_scenarios.id"), primary_key=True)
    calculated_at = Column(DateTime(timezone=True), nullable=False)
    model_version = Column(String(50), nullable=False)
    source_version = Column(String(64), nullable=False)
    time_horizon = Column(Integer, nullable=False)
    parameters = Column(JSON, nullable=False)
    assumptions = Column(JSON, nullable=False)
    starting_cash = Column(Float, nullable=False)
    cash_balance_known = Column(Boolean, nullable=False)
    scenario = relationship("ProjectionScenario", back_populates="calculation")


class HoldingsValueHistory(Base):
    """Month-end snapshot of the holdings market value, used to plot actual net worth."""
    __tablename__ = "holdings_value_history"
    __table_args__ = (
        UniqueConstraint('year', 'month', name='uq_holdings_value_history_year_month'),
    )

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    value = Column(Float, nullable=False)
    updated_at = Column(Date, nullable=False, default=date.today, onupdate=date.today)
