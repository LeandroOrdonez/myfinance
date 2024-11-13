import pandas as pd
from typing import List
from ..schemas.transaction import TransactionCreate
from ..models.transaction import TransactionType

class CSVParser:
    @staticmethod
    def detect_bank_format(headers: List[str]) -> str:
        ing_headers = {"Account Number", "Account Name", "Counterparty account", "Booking date"}
        kbc_headers = {"Account number", "Heading", "Name", "Currency"}
        
        headers_set = set(headers)
        if ing_headers.issubset(headers_set):
            return "ING"
        elif kbc_headers.issubset(headers_set):
            return "KBC"
        else:
            raise ValueError("Unsupported CSV format")

    @staticmethod
    def convert_amount(amount_str: str) -> float:
        """Convert string amount to float, handling different number formats"""
        # Remove any whitespace
        amount_str = str(amount_str).strip()
        # Replace comma with period for decimal point
        amount_str = amount_str.replace(',', '.')
        return float(amount_str)

    @staticmethod
    def convert_date(date_str: str) -> str:
        """Convert date from DD/MM/YYYY to YYYY-MM-DD format"""
        try:
            day, month, year = date_str.split('/')
            return f"{year}-{month}-{day}"
        except ValueError:
            return date_str  # Return as-is if already in correct format

    @staticmethod
    def parse_ing_csv(file_path: str) -> List[TransactionCreate]:
        df = pd.read_csv(file_path, sep=';')
        transactions = []
        
        for _, row in df.iterrows():
            amount = CSVParser.convert_amount(row["Amount"])
            transaction = TransactionCreate(
                account_number=row["Account Number"],
                transaction_date=CSVParser.convert_date(row["Booking date"]),
                amount=amount,
                currency=row["Currency"],
                description=row["Description"],
                counterparty_account=row["Counterparty account"]
                    if pd.notna(row["Counterparty account"]) else None,
                transaction_type=TransactionType.INCOME if amount > 0 else TransactionType.EXPENSE,
                source_bank="ING"
            )
            transactions.append(transaction)
            
        return transactions

    @staticmethod
    def parse_kbc_csv(file_path: str) -> List[TransactionCreate]:
        df = pd.read_csv(file_path, sep=';')
        transactions = []
        
        for _, row in df.iterrows():
            amount = CSVParser.convert_amount(row["Amount"])
            transaction = TransactionCreate(
                account_number=row["Account number"],
                transaction_date=CSVParser.convert_date(row["Date"]),
                amount=amount,
                currency=row["Currency"],
                description=row["Description"],
                counterparty_name=row["Counterparty name"]
                    if pd.notna(row["Counterparty name"]) else None,
                counterparty_account=row["counterparty's account number"]
                    if pd.notna(row["counterparty's account number"]) else None,
                transaction_type=TransactionType.INCOME if amount > 0 else TransactionType.EXPENSE,
                source_bank="KBC"
            )
            transactions.append(transaction)
            
        return transactions
