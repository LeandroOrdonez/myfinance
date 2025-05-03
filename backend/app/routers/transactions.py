from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
from typing import List
import tempfile
import os
import logging

from ..database import get_db
from ..models import transaction as models
from ..schemas import transaction as schemas
from ..services.csv_parser import CSVParser
from ..services.statistics_service import StatisticsService
from ..models.transaction import ExpenseCategory, IncomeCategory, TransactionType
from datetime import date, datetime

from ..services.category_suggestion_service import CategorySuggestionService

# Set up logging
logger = logging.getLogger(__name__)

# Initialize the service
category_suggestion_service = CategorySuggestionService()

# Create router
router = APIRouter(
    prefix="/transactions",
    tags=["transactions"]
)

# Define sort field mapping
SORT_FIELD_MAPPING = {
    'date': 'transaction_date',
    'description': 'description',
    'amount': 'amount',
    'type': 'transaction_type'
}

@router.post("/upload/", response_model=List[schemas.Transaction])
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
            # Parse based on detected format
            transactions = CSVParser.parse_csv(temp_file.name)
            
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

@router.get("/", response_model=schemas.TransactionPage)
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

@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    transaction_date = transaction.transaction_date
    
    # Delete the transaction
    db.delete(transaction)
    
    # Commit deletion before updating statistics
    db.commit()
    
    # Update statistics for the affected period
    StatisticsService.update_statistics(db, transaction_date)
    
    return {"message": "Transaction deleted successfully"}

@router.patch("/{transaction_id}/category")
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

@router.post("/restore", response_model=schemas.Transaction)
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
