from pydantic import BaseModel, validator
from datetime import date
from typing import Optional
from ..models.transaction import ExpenseCategory, IncomeCategory, TransactionType

class TransactionBase(BaseModel):
    account_number: str
    transaction_date: date
    amount: float
    currency: str
    description: str
    counterparty_name: Optional[str] = None
    counterparty_account: Optional[str] = None
    transaction_type: Optional[TransactionType] = None
    expense_category: Optional[ExpenseCategory] = None
    income_category: Optional[IncomeCategory] = None
    source_bank: str

    @validator('transaction_type', pre=True, always=True)
    def set_transaction_type(cls, v, values):
        if v is not None:
            return v
        if 'amount' in values:
            return TransactionType.EXPENSE if values['amount'] < 0 else TransactionType.INCOME
        return None

    @validator('expense_category', 'income_category')
    def validate_categories(cls, v, values):
        if 'transaction_type' in values:
            if values['transaction_type'] == TransactionType.EXPENSE and isinstance(v, ExpenseCategory):
                return v
            if values['transaction_type'] == TransactionType.INCOME and isinstance(v, IncomeCategory):
                return v
            return None
        return v

class TransactionCreate(TransactionBase):
    @validator('expense_category', 'income_category', pre=True)
    def validate_categories(cls, v, values):
        if not v:
            return None
            
        if 'transaction_type' in values:
            if values['transaction_type'] == TransactionType.EXPENSE:
                return ExpenseCategory(v) if isinstance(v, (str, ExpenseCategory)) else None
            if values['transaction_type'] == TransactionType.INCOME:
                return IncomeCategory(v) if isinstance(v, (str, IncomeCategory)) else None
        return None

class Transaction(TransactionBase):
    id: int

    class Config:
        orm_mode = True
        
class TransactionRestore(TransactionBase):
    id: Optional[int] = None

    class Config:
        orm_mode = True

class TransactionPage(BaseModel):
    items: list[Transaction]
    total: int
    page: int
    page_size: int
    total_pages: int

    class Config:
        orm_mode = True
