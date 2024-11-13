from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
from typing import List
import tempfile
import os

from .database import get_db
from .models import transaction as models
from .schemas import transaction as schemas
from .services.csv_parser import CSVParser
from .services.statistics_service import StatisticsService
from .models.transaction import ExpenseCategory, IncomeCategory, TransactionType
from .database_manager import init_database, reset_database
import logging
import calendar

from .models.statistics import FinancialStatistics, StatisticsPeriod
from datetime import date, timedelta

from .services.category_suggestion_service import CategorySuggestionService
from pydantic import BaseModel

# Initialize the database
init_database()

# Initialize the service
category_suggestion_service = CategorySuggestionService()

app = FastAPI(title="MyFinance API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.post("/upload/", response_model=List[schemas.Transaction])
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, detail="Invalid file format. Please upload a CSV file.")

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_file.seek(0)
        
        try:
            # Read CSV headers to detect format
            df = pd.read_csv(temp_file.name, sep=';', nrows=0)
            print(df.columns.tolist())
            bank_format = CSVParser.detect_bank_format(df.columns.tolist())
            
            # Parse based on detected format
            if bank_format == "ING":
                transactions = CSVParser.parse_ing_csv(temp_file.name)
            else:
                transactions = CSVParser.parse_kbc_csv(temp_file.name)
            
            # Save to database
            db_transactions = []
            for trans in transactions:
                db_trans = models.Transaction(**trans.dict())
                db.add(db_trans)
                db_transactions.append(db_trans)
            
            db.commit()
            
            # Refresh to get IDs
            for trans in db_transactions:
                db.refresh(trans)
                category_suggestion_service.add_transaction(trans)            
            return db_transactions
            
        finally:
            os.unlink(temp_file.name)

# Add a debug endpoint to reset the database
@app.post("/debug/reset-database")
def debug_reset_database():
    try:
        reset_database()
        return {"message": "Database reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

SORT_FIELD_MAPPING = {
    'date': 'transaction_date',
    'description': 'description',
    'amount': 'amount',
    'type': 'transaction_type'
}

@app.get("/transactions/")
def get_transactions(
    db: Session = Depends(get_db),
    page: int = Query(1, gt=0),
    page_size: int = Query(10, gt=0, le=100),
    sort_field: str = Query('date', regex='^(date|description|amount|type)$'),
    sort_direction: str = Query('desc', regex='^(asc|desc)$')
):
    try:
        # Map frontend field name to database field name
        db_sort_field = SORT_FIELD_MAPPING.get(sort_field, 'transaction_date')
        
        # Build the base query
        query = db.query(models.Transaction)
        
        # Add sorting
        if sort_direction == 'asc':
            sort_column = getattr(models.Transaction, db_sort_field).asc()
        else:
            sort_column = getattr(models.Transaction, db_sort_field).desc()
            
        query = query.order_by(sort_column)
        
        # Get total count before pagination
        total_count = query.count()
        
        # Add pagination
        offset = (page - 1) * page_size
        transactions = query.offset(offset).limit(page_size).all()
        
        return {
            "items": transactions,
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size
        }
    except Exception as e:
        logging.error(f"Error fetching transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    transaction_date = transaction.transaction_date
    
    # Delete the transaction
    db.delete(transaction)
    
    # Update statistics for the affected period
    StatisticsService.update_statistics(db, transaction_date)
    
    db.commit()
    return {"message": "Transaction deleted successfully"}

@app.patch("/transactions/{transaction_id}/category")
def update_transaction_category(
    transaction_id: int,
    category: str = Query(...),
    transaction_type: TransactionType = Query(...),
    db: Session = Depends(get_db)
):
    transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id
    ).first()
    
    if not transaction:
        raise HTTPException(404, detail="Transaction not found")
    
    transaction_date = transaction.transaction_date
    
    if transaction_type == TransactionType.EXPENSE:
        transaction.expense_category = ExpenseCategory(category)
        transaction.income_category = None
    else:
        transaction.income_category = IncomeCategory(category)
        transaction.expense_category = None
    
    # Update statistics for the affected period
    StatisticsService.update_statistics(db, transaction_date)
    
    db.commit()
    db.refresh(transaction)
    return transaction

@app.get("/statistics/by-category")
def get_category_statistics(db: Session = Depends(get_db)):
    # Get expense statistics
    expense_stats = db.query(
        models.Transaction.expense_category,
        func.sum(models.Transaction.amount).label("total_amount"),
        func.count(models.Transaction.id).label("transaction_count")
    ).filter(
        models.Transaction.transaction_type == models.TransactionType.EXPENSE
    ).group_by(models.Transaction.expense_category).all()

    # Get income statistics
    income_stats = db.query(
        models.Transaction.income_category,
        func.sum(models.Transaction.amount).label("total_amount"),
        func.count(models.Transaction.id).label("transaction_count")
    ).filter(
        models.Transaction.transaction_type == models.TransactionType.INCOME
    ).group_by(models.Transaction.income_category).all()

    results = []
    
    # Process expense statistics
    for stat in expense_stats:
        if stat.expense_category:
            results.append({
                "category": stat.expense_category.value,
                "total_amount": abs(float(stat.total_amount)),
                "transaction_count": stat.transaction_count,
                "transaction_type": "Expense"
            })

    # Process income statistics
    for stat in income_stats:
        if stat.income_category:
            results.append({
                "category": stat.income_category.value,
                "total_amount": float(stat.total_amount),
                "transaction_count": stat.transaction_count,
                "transaction_type": "Income"
            })

    return results

@app.get("/statistics/overview")
def get_statistics_overview(db: Session = Depends(get_db)):
    try:
        # Get latest transaction date
        latest_transaction = db.query(models.Transaction).order_by(models.Transaction.transaction_date.desc()).first()
        
        if not latest_transaction:
            # Return empty/zero statistics if no transactions exist
            empty_stats = {
                "period_income": 0,
                "period_expenses": 0,
                "period_net_savings": 0,
                "savings_rate": 0,
                "total_income": 0,
                "total_expenses": 0,
                "total_net_savings": 0,
                "income_count": 0,
                "expense_count": 0,
                "average_income": 0,
                "average_expense": 0,
                "yearly_income": 0,
                "yearly_expenses": 0,
                "date": date.today().replace(day=calendar.monthrange(date.today().year, date.today().month)[1]).isoformat()
            }
            return {
                "current_month": empty_stats,
                "last_month": empty_stats,
                "previous_year_last_month": None,
                "all_time": empty_stats
            }
        
        # Set current month to last day of the month
        current_month = latest_transaction.transaction_date.replace(
            day=calendar.monthrange(latest_transaction.transaction_date.year, latest_transaction.transaction_date.month)[1]
        )

        # Get current month stats
        current_month_stats = db.query(FinancialStatistics).filter(
            FinancialStatistics.period == StatisticsPeriod.MONTHLY,
            FinancialStatistics.date == current_month
        ).first()
        
        if not current_month_stats:
            raise HTTPException(status_code=404, detail="Current month statistics not found")
        
        # Get last month stats
        last_month = current_month - timedelta(days=calendar.monthrange(current_month.year, current_month.month)[1])
        last_month_stats = db.query(FinancialStatistics).filter(
            FinancialStatistics.period == StatisticsPeriod.MONTHLY,
            FinancialStatistics.date == last_month
        ).first()
        
        if not last_month_stats:
            # Use empty stats for last month if not found
            last_month_stats = {
                "period_income": 0,
                "period_expenses": 0,
                "period_net_savings": 0,
                "savings_rate": 0,
                "total_income": 0,
                "total_expenses": 0,
                "total_net_savings": 0,
                "income_count": 0,
                "expense_count": 0,
                "average_income": 0,
                "average_expense": 0,
                "yearly_income": 0,
                "yearly_expenses": 0,
                "date": last_month.isoformat()
            }
        
        # Get last month of previous year stats (if exists)
        previous_year_last_month = date(current_month.year - 1, 12, 31)
        previous_year_last_month_stats = db.query(FinancialStatistics).filter(
            FinancialStatistics.period == StatisticsPeriod.MONTHLY,
            FinancialStatistics.date == previous_year_last_month
        ).first()
        
        # If no previous year data exists, set to None
        # The frontend will handle this case appropriately
        
        # Get all time stats
        all_time_stats = db.query(FinancialStatistics).filter(
            FinancialStatistics.period == StatisticsPeriod.ALL_TIME
        ).first()
        
        if not all_time_stats:
            raise HTTPException(status_code=404, detail="All time statistics not found")
        
        return {
            "current_month": current_month_stats,
            "last_month": last_month_stats,
            "previous_year_last_month": previous_year_last_month_stats,  # This might be None
            "all_time": all_time_stats
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in get_statistics_overview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/statistics/initialize")
def initialize_statistics(db: Session = Depends(get_db)):
    try:
        StatisticsService.initialize_statistics(db)
        return {"message": "Statistics initialized successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/statistics/timeseries")
def get_statistics_timeseries(db: Session = Depends(get_db)):
    try:
        # Get monthly statistics ordered by date
        monthly_stats = db.query(FinancialStatistics).filter(
            FinancialStatistics.period == StatisticsPeriod.MONTHLY
        ).order_by(FinancialStatistics.date).all()
        
        return monthly_stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/initialize-suggestions")
def initialize_category_suggestions(db: Session = Depends(get_db)):
    try:
        category_suggestion_service.train_on_existing_transactions(db)
        return {"message": "Category suggestion model initialized successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# New schema for the request body
class CategorySuggestionRequest(BaseModel):
    description: str
    amount: float
    transaction_type: TransactionType

@app.post("/suggest-category")
def suggest_category(
    request: CategorySuggestionRequest,
    db: Session = Depends(get_db)
):
    try:
        suggestions = category_suggestion_service.suggest_category(
            request.description,
            request.amount,
            request.transaction_type
        )
        return {
            "suggestions": [
                {
                    "category": category,
                    "confidence": float(confidence)
                }
                for category, confidence in suggestions
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
