from sqlalchemy import Column, Integer, Float, String, Date, DateTime, Enum
from sqlalchemy.sql import func
from ..database import Base
from .statistics import StatisticsPeriod

class FinancialHealthScore(Base):
    __tablename__ = "financial_health_scores"

    id = Column(Integer, primary_key=True, index=True)
    period = Column(Enum(StatisticsPeriod), nullable=False)
    date = Column(Date, nullable=True)

    overall_score = Column(Float, default=0)
    savings_rate = Column(Float, default=0)
    expense_ratio = Column(Float, default=0)
    budget_adherence = Column(Float, default=0)
    dti_ratio = Column(Float, default=0)
    emergency_fund_ratio = Column(Float, default=0)
    spending_stability = Column(Float, default=0)

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    metric = Column(String(50), nullable=False)
    description = Column(String(500), nullable=False)
    status = Column(String(20), default="pending")
    progress = Column(Float, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class HealthGoal(Base):
    __tablename__ = "health_goals"

    id = Column(Integer, primary_key=True, index=True)
    metric = Column(String(50), nullable=False)
    target_value = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
