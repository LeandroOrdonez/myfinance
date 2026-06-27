from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, UniqueConstraint
from ..database import Base
from datetime import datetime


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (
        UniqueConstraint('category', name='uq_budget_category'),
    )

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100), nullable=False)  # Stores an ExpenseCategory value
    limit_amount = Column(Float, nullable=False)
    period = Column(String(20), nullable=False, default="monthly")  # Reserved for future; always "monthly" now
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
