from sqlalchemy import Column, Integer, Float, String, Date, Enum, ForeignKey
from ..database import Base
from .transaction import TransactionType, ExpenseCategory, IncomeCategory, ExpenseType
import enum

class StatisticsPeriod(enum.Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"
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

class CategoryStatistics(Base):
    __tablename__ = "category_statistics"
    
    id = Column(Integer, primary_key=True, index=True)
    period = Column(Enum(StatisticsPeriod), nullable=False)
    date = Column(Date, nullable=True)  # Null for ALL_TIME
    
    # Category identification
    category_name = Column(String(100), nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    expense_type = Column(Enum(ExpenseType), nullable=True)  # Essential or Discretionary (null for income)
    
    # Period-specific metrics
    period_amount = Column(Float, default=0)
    period_transaction_count = Column(Integer, default=0)
    period_percentage = Column(Float, default=0)  # Percentage of total for the period
    
    # Cumulative metrics
    total_amount = Column(Float, default=0)
    total_transaction_count = Column(Integer, default=0)
    
    # Averages
    average_transaction_amount = Column(Float, default=0)
    
    # Yearly metrics
    yearly_amount = Column(Float, default=0)
    yearly_transaction_count = Column(Integer, default=0)
    
    # Unique constraint
    __table_args__ = (
        # unique constraint for category, transaction_type, period, and date
        {'sqlite_autoincrement': True},
    )