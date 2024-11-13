from sqlalchemy import Column, Integer, Float, String, Date, Enum
from ..database import Base
from .transaction import TransactionType
import enum

class StatisticsPeriod(enum.Enum):
    DAILY = "daily"
    MONTHLY = "monthly"
    ALL_TIME = "all_time"

class FinancialStatistics(Base):
    __tablename__ = "financial_statistics"

    id = Column(Integer, primary_key=True, index=True)
    period = Column(Enum(StatisticsPeriod), nullable=False)
    date = Column(Date, nullable=True)  # Null for ALL_TIME
    
    # Period-specific metrics
    period_income = Column(Float, default=0)
    period_expenses = Column(Float, default=0)
    period_net_savings = Column(Float, default=0)
    savings_rate = Column(Float, default=0)  # Always period-specific
    
    # Cumulative metrics
    total_income = Column(Float, default=0)
    total_expenses = Column(Float, default=0)
    total_net_savings = Column(Float, default=0)
    
    # Transaction counts
    income_count = Column(Integer, default=0)
    expense_count = Column(Integer, default=0)
    
    # Averages (can be calculated from other fields)
    average_income = Column(Float, default=0)
    average_expense = Column(Float, default=0)
    
    # New: Yearly metrics
    yearly_income = Column(Float, default=0)
    yearly_expenses = Column(Float, default=0)