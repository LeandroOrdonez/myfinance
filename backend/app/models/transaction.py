from sqlalchemy import Column, Integer, String, Float, Date, Enum
from ..database import Base
import enum

class TransactionType(enum.Enum):
    INCOME = "Income"
    EXPENSE = "Expense"

class ExpenseCategory(enum.Enum):
    HOUSING = "Housing"
    UTILITIES = "Utilities"
    GROCERIES = "Groceries"
    EATING_OUT = "Eating Out"
    TRANSPORTATION = "Transportation"
    INSURANCE = "Insurance"
    DEBT = "Debt"
    INVESTMENTS = "Investments"
    PERSONAL = "Personal"
    GIFTS = "Gifts"
    DONATIONS = "Donations"
    EDUCATION = "Education"
    TRAVEL = "Travel"
    ENTERTAINMENT = "Entertainment"
    OTHERS = "Others"

class IncomeCategory(enum.Enum):
    SALARY = "Salary"
    INVESTMENTS = "Investment Income"
    BUSINESS = "Business Income"
    RENTAL = "Rental Income"
    FREELANCE = "Freelance Income"
    PENSION = "Pension"
    BENEFITS = "Benefits"
    GIFTS = "Gifts Received"
    REFUNDS = "Refunds"
    OTHER = "Other Income"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String(50), index=True)
    transaction_date = Column(Date, index=True)
    amount = Column(Float)
    currency = Column(String(3))
    description = Column(String(500))
    counterparty_name = Column(String(200), nullable=True)
    counterparty_account = Column(String(50), nullable=True)
    transaction_type = Column(Enum(TransactionType))
    expense_category = Column(Enum(ExpenseCategory), nullable=True)
    income_category = Column(Enum(IncomeCategory), nullable=True)
    source_bank = Column(String(10))
