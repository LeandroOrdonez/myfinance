from sqlalchemy import Column, Integer, Float, String, Date, ForeignKey, JSON, Boolean
from ..database import Base
import enum
from datetime import date


class FinancialHealth(Base):
    __tablename__ = "financial_health"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    
    # Overall score (0-100)
    overall_score = Column(Float, default=0)
    
    # Component scores (0-100)
    savings_rate_score = Column(Float, default=0)
    expense_ratio_score = Column(Float, default=0)
    budget_adherence_score = Column(Float, default=0)
    debt_to_income_score = Column(Float, default=0)
    emergency_fund_score = Column(Float, default=0)
    spending_stability_score = Column(Float, default=0)
    investment_rate_score = Column(Float, default=0)
    
    # Raw metrics (for reference)
    savings_rate = Column(Float, default=0)  # Percentage
    expense_ratio = Column(Float, default=0)  # Ratio
    budget_adherence = Column(Float, default=0)  # Percentage
    debt_to_income = Column(Float, default=0)  # Ratio
    emergency_fund_months = Column(Float, default=0)  # Number of months
    spending_stability = Column(Float, default=0)  # Coefficient of variation
    investment_rate = Column(Float, default=0)  # Percentage of income invested
    
    # Metadata
    recommendations = Column(JSON, nullable=True)  # Store recommendations as JSON


class FinancialRecommendation(Base):
    __tablename__ = "financial_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    date_created = Column(Date, nullable=False, default=date.today)
    
    # Recommendation details
    title = Column(String(200), nullable=False)
    description = Column(String(1000), nullable=False)
    category = Column(String(100), nullable=False)  # Which component this addresses
    impact_area = Column(String(100), nullable=False)  # Which score this would improve
    priority = Column(Integer, default=0)  # 1-5, with 5 being highest priority
    
    # Tracking
    is_completed = Column(Boolean, default=False)
    date_completed = Column(Date, nullable=True)
    
    # Potential impact
    estimated_score_improvement = Column(Float, default=0)  # Estimated points of improvement
