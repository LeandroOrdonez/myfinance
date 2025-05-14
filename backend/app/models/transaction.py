from sqlalchemy import Column, Integer, String, Float, Date, Enum
from ..database import Base
import enum

class TransactionType(enum.Enum):
    INCOME = "Income"
    EXPENSE = "Expense"

class ExpenseType(enum.Enum):
    ESSENTIAL = "Essential"
    DISCRETIONARY = "Discretionary"

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
    
    @property
    def expense_type(self):
        """
        Classify expense categories as either essential or discretionary
        """
        essential_categories = [
            ExpenseCategory.HOUSING,
            ExpenseCategory.UTILITIES,
            ExpenseCategory.GROCERIES,
            ExpenseCategory.TRANSPORTATION,
            ExpenseCategory.INSURANCE,
            ExpenseCategory.DEBT
        ]
        
        return ExpenseType.ESSENTIAL if self in essential_categories else ExpenseType.DISCRETIONARY
    
    @property
    def is_essential(self):
        """
        Check if the expense category is essential
        """
        return self.expense_type == ExpenseType.ESSENTIAL
    
    @property
    def is_discretionary(self):
        """
        Check if the expense category is discretionary
        """
        return self.expense_type == ExpenseType.DISCRETIONARY
    
    @classmethod
    def get_essential_categories(cls):
        """
        Return a list of all essential expense categories
        """
        return [category for category in cls if category.is_essential]
    
    @classmethod
    def get_discretionary_categories(cls):
        """
        Return a list of all discretionary expense categories
        """
        return [category for category in cls if category.is_discretionary]

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
