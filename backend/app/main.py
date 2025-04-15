from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
from typing import List
import tempfile
import os
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from .database import get_db
from .models import transaction as models
from .schemas import transaction as schemas
from .services.csv_parser import CSVParser
from .services.statistics_service import StatisticsService
from .models.transaction import ExpenseCategory, IncomeCategory, TransactionType
from .database_manager import init_database, reset_database
import calendar

from .models.statistics import FinancialStatistics, CategoryStatistics, StatisticsPeriod
from datetime import date, timedelta, datetime

from .services.category_suggestion_service import CategorySuggestionService
from pydantic import BaseModel

# Initialize the database
init_database()

# Initialize the service
category_suggestion_service = CategorySuggestionService()

# Initialize category suggestions
with next(get_db()) as db:
    category_suggestion_service.train_on_existing_transactions(db)

app = FastAPI(title="MyFinance API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
            df = CSVParser.read_csv_with_fallback(temp_file.name)
            print(df.columns.tolist())
            bank_format = CSVParser.detect_bank_format(df.columns.tolist())
            
            # Parse based on detected format
            if bank_format == "ING":
                transactions = CSVParser.parse_ing_csv(temp_file.name)
            else:
                transactions = CSVParser.parse_kbc_csv(temp_file.name)
            
            # Save to database with category suggestions
            db_transactions = []
            for trans in transactions:
                # Get category suggestions before creating the transaction
                suggestions = category_suggestion_service.suggest_category(
                    trans.description,
                    trans.amount,
                    trans.transaction_type
                )
                
                # If we have suggestions with high confidence, set the category
                if suggestions and suggestions[0][1] > 0.5:  # Check if confidence > 0.5
                    best_category, confidence = suggestions[0]
                    logger.info(f"Setting category {best_category} with confidence {confidence} for transaction: {trans.description}")
                    
                    if trans.transaction_type == TransactionType.EXPENSE:
                        trans.expense_category = ExpenseCategory(best_category)
                    else:
                        trans.income_category = IncomeCategory(best_category)
                
                # Create and save the transaction
                db_trans = models.Transaction(**trans.dict())
                db.add(db_trans)
                db_transactions.append(db_trans)
            
            db.commit()
            
            # Refresh to get IDs and add to suggestion service
            for trans in db_transactions:
                db.refresh(trans)
                if trans.expense_category or trans.income_category:
                    category_suggestion_service.add_transaction(trans)
                    
            return db_transactions
            
        except Exception as e:
            logger.error(f"Error processing CSV upload: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
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
    sort_direction: str = Query('desc', regex='^(asc|desc)$'),
    search: str = Query(None, description="Search term for description/counterparty"),
    category: str = Query(None, description="Category filter (expense or income)"),
    start_date: str = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="End date (YYYY-MM-DD)")
):
    try:
        from sqlalchemy import or_, and_
        from datetime import datetime
        # Map frontend field name to database field name
        db_sort_field = SORT_FIELD_MAPPING.get(sort_field, 'transaction_date')
        
        # Build the base query
        query = db.query(models.Transaction)

        # Apply search filter
        if search:
            ilike_str = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    func.lower(models.Transaction.description).ilike(ilike_str),
                    func.lower(models.Transaction.counterparty_name).ilike(ilike_str)
                )
            )
        # Apply category filter
        if category and category != 'all':
            # Try to match ExpenseCategory or IncomeCategory enums
            from .models.transaction import ExpenseCategory, IncomeCategory
            expense_enum = None
            income_enum = None
            try:
                expense_enum = ExpenseCategory(category)
            except Exception:
                pass
            try:
                income_enum = IncomeCategory(category)
            except Exception:
                pass
            if expense_enum and income_enum:
                query = query.filter(
                    or_(
                        models.Transaction.expense_category == expense_enum,
                        models.Transaction.income_category == income_enum
                    )
                )
            elif expense_enum:
                query = query.filter(models.Transaction.expense_category == expense_enum)
            elif income_enum:
                query = query.filter(models.Transaction.income_category == income_enum)
            else:
                query = query.filter(False)  # No match, return empty
        # Apply date range filter
        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d").date()
                query = query.filter(models.Transaction.transaction_date >= start)
            except Exception:
                pass
        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d").date()
                query = query.filter(models.Transaction.transaction_date <= end)
            except Exception:
                pass

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
        logger.error(f"Error fetching transactions: {str(e)}")
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
def get_category_statistics(
    db: Session = Depends(get_db),
    period: str = Query("monthly", description="Statistics period (monthly, yearly, all_time)"),
    date: str = Query(None, description="Target date in ISO format (YYYY-MM-DD). Required for monthly/yearly periods.")
):
    try:
        # Convert period string to enum
        try:
            stat_period = StatisticsPeriod(period)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid period: {period}. Must be one of: monthly, yearly, all_time")
        
        # Get latest transaction date
        latest_transaction = db.query(models.Transaction).order_by(models.Transaction.transaction_date.desc()).first()
        
        # Parse date if provided and needed
        target_date = None

        if not date:
            target_date = latest_transaction.transaction_date
        elif stat_period != StatisticsPeriod.ALL_TIME:
            try:
                target_date = datetime.strptime(date, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid date format: {date}. Use YYYY-MM-DD")
        
        # For ALL_TIME, we don't need a specific date
        if stat_period == StatisticsPeriod.ALL_TIME:
            target_date = None
        # For MONTHLY and no date specified, use last day of current month
        elif stat_period == StatisticsPeriod.MONTHLY and not target_date:
            today = datetime.now().date()
            target_date = today.replace(day=calendar.monthrange(today.year, today.month)[1])
        # For YEARLY and no date specified, use last day of current year
        elif stat_period == StatisticsPeriod.YEARLY and not target_date:
            today = datetime.now().date()
            target_date = datetime(today.year, 12, 31).date()
        
        # If it's monthly period, ensure we're using the last day of the month
        if stat_period == StatisticsPeriod.MONTHLY and target_date:
            target_date = target_date.replace(day=calendar.monthrange(target_date.year, target_date.month)[1])
        # If it's yearly period, ensure we're using the last day of the year
        elif stat_period == StatisticsPeriod.YEARLY and target_date:
            target_date = datetime(target_date.year, 12, 31).date()
            
        # Query category statistics from the new model
        query = db.query(CategoryStatistics).filter(
            CategoryStatistics.period == stat_period
        )
        
        # Add date filter if needed
        if target_date and stat_period != StatisticsPeriod.ALL_TIME:
            query = query.filter(CategoryStatistics.date == target_date)
        
        # Execute query
        stats = query.all()
        
        if not stats:
            logger.error(f"Error in get_category_statistics: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
        
        # Format results
        results = []
        for stat in stats:
            result = {
                "category": stat.category_name,
                "transaction_type": stat.transaction_type.value,
                "period": stat.period.value,
                "date": stat.date.isoformat() if stat.date else None,
                
                # Period-specific metrics
                "period_amount": float(stat.period_amount),
                "period_transaction_count": stat.period_transaction_count,
                "period_percentage": float(stat.period_percentage),
                
                # For backward compatibility
                "total_amount": float(stat.period_amount),
                "transaction_count": stat.period_transaction_count,
                
                # Cumulative metrics
                "total_amount_cumulative": float(stat.total_amount),
                "total_transaction_count": stat.total_transaction_count,
                
                # Averages
                "average_transaction_amount": float(stat.average_transaction_amount),
                
                # Yearly metrics
                "yearly_amount": float(stat.yearly_amount),
                "yearly_transaction_count": stat.yearly_transaction_count
            }
            results.append(result)
        
        return results
    except Exception as e:
        logger.error(f"Error in get_category_statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
        logger.error(f"Error in get_statistics_overview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/statistics/initialize")
def initialize_statistics(db: Session = Depends(get_db)):
    try:
        StatisticsService.initialize_statistics(db)
        return {"message": "Statistics initialized successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/statistics/timeseries")
def get_statistics_timeseries(
    db: Session = Depends(get_db),
    start_date: str = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="End date (YYYY-MM-DD)")
):
    try:
        query = db.query(FinancialStatistics).filter(
            FinancialStatistics.period == StatisticsPeriod.MONTHLY
        )
        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d").date()
                query = query.filter(FinancialStatistics.date >= start)
            except Exception:
                pass
        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d").date()
                query = query.filter(FinancialStatistics.date <= end)
            except Exception:
                pass
        monthly_stats = query.order_by(FinancialStatistics.date).all()
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
        
@app.post("/transactions/restore", response_model=schemas.Transaction)
def restore_transaction(
    transaction_data: schemas.TransactionRestore = Body(...),
    db: Session = Depends(get_db)
):
    try:
        # Create a new transaction with the provided data
        # The ID will be auto-generated, which is fine for our purpose
        new_transaction = models.Transaction(**transaction_data.dict(exclude={"id"}))
        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)
        
        # Update statistics for the affected period
        StatisticsService.update_statistics(db, new_transaction.transaction_date)
        
        return new_transaction
        
    except Exception as e:
        logger.error(f"Error restoring transaction: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
