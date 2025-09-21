from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query, Body, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
from typing import List, Dict
import tempfile
import os
import logging
import time

from ..database import get_db
from ..models.transaction import Transaction, ExpenseCategory, IncomeCategory, TransactionType
from ..schemas import transaction as schemas
from ..services.csv_parser import CSVParser
from ..services.statistics_service import StatisticsService
from ..services.anomaly_detection_service import AnomalyDetectionService
from ..routers.suggestions import category_suggestion_service
from datetime import date, datetime

# Set up logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/transactions",
    tags=["transactions"]
)

# ----------------------------------------------------------------------------
# Upload guardrail configuration
# ----------------------------------------------------------------------------
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB limit
ALLOWED_CONTENT_TYPES = {
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "application/octet-stream",  # common fallback in some browsers/OSes
    "text/plain",               # some systems tag CSV as plain text
    "",                         # occasionally missing content type
}
MAX_ROWS_PER_UPLOAD = 5000
MAX_NEW_TRANSACTIONS_PER_UPLOAD = 2000

# Simple in-memory rate limiting (per-IP)
RATE_LIMIT_WINDOW_SECONDS = 60
MAX_UPLOADS_PER_WINDOW = 3
_upload_attempts: Dict[str, List[float]] = {}

def _check_rate_limit(client_ip: str) -> None:
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW_SECONDS
    timestamps = _upload_attempts.get(client_ip, [])
    # Keep only timestamps within the window
    timestamps = [t for t in timestamps if t >= window_start]
    if len(timestamps) >= MAX_UPLOADS_PER_WINDOW:
        raise HTTPException(status_code=429, detail="Too many uploads. Please wait a minute and try again.")
    timestamps.append(now)
    _upload_attempts[client_ip] = timestamps

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
    db: Session = Depends(get_db),
    request: Request = None,
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, detail="Invalid file format. Please upload a CSV file.")

    # Check content type (some browsers send application/vnd.ms-excel for CSV)
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported media type. Please upload a CSV file.")

    # Per-IP rate limiting
    try:
        client_ip = request.client.host if request and request.client else "unknown"
    except Exception:
        client_ip = "unknown"
    _check_rate_limit(client_ip)

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        # Stream the incoming upload to avoid loading entire file into memory,
        # enforcing a maximum allowed size while writing.
        total_bytes = 0
        while True:
            chunk = await file.read(1_048_576)  # 1 MB chunks
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail=f"File too large. Max allowed size is {MAX_UPLOAD_BYTES // (1024*1024)} MB.")
            temp_file.write(chunk)
        temp_file.flush()
        
        try:
            # Parse based on detected format
            transactions = CSVParser.parse_csv(temp_file.name)
            # Guardrail: hard cap on number of rows parsed
            if len(transactions) > MAX_ROWS_PER_UPLOAD:
                raise HTTPException(status_code=400, detail=f"CSV contains {len(transactions)} rows. The maximum allowed per upload is {MAX_ROWS_PER_UPLOAD}.")
            
            # Save to database with category suggestions
            db_transactions = []
            skipped_count = 0
            
            for trans in transactions:
                # Check for duplicate transaction
                existing_transaction = db.query(Transaction).filter(
                    Transaction.account_number == trans.account_number,
                    Transaction.transaction_date == trans.transaction_date,
                    Transaction.amount == trans.amount,
                    Transaction.description == trans.description,
                    Transaction.source_bank == trans.source_bank
                ).first()
                
                if existing_transaction:
                    logger.warning(f"Skipping duplicate transaction: {trans.description} on {trans.transaction_date} for {trans.amount} {trans.currency}")
                    skipped_count += 1
                    continue
                
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
                db_trans = Transaction(**trans.dict())
                db.add(db_trans)
                db_transactions.append(db_trans)

                # Guardrail: cap the number of new transactions created per upload
                if len(db_transactions) >= MAX_NEW_TRANSACTIONS_PER_UPLOAD:
                    logger.info(
                        f"Reached per-upload creation cap of {MAX_NEW_TRANSACTIONS_PER_UPLOAD} new transactions; remaining rows will be ignored."
                    )
                    break
            
            if skipped_count > 0:
                logger.info(f"Skipped {skipped_count} duplicate transactions during import")
                
            if not db_transactions:
                logger.warning("No new transactions were imported - all were duplicates")
                return []
                
            db.commit()
            
            # Refresh to get IDs and add to suggestion service
            for trans in db_transactions:
                db.refresh(trans)
                if trans.expense_category or trans.income_category:
                    category_suggestion_service.add_transaction(trans)
            
            # Run anomaly detection on newly imported transactions
            if db_transactions:
                try:
                    transaction_ids = [t.id for t in db_transactions]
                    AnomalyDetectionService.detect_anomalies(
                        db=db,
                        transaction_ids=transaction_ids,
                        force_redetection=False
                    )
                    logger.info(f"Anomaly detection completed for {len(transaction_ids)} new transactions")
                except Exception as e:
                    logger.warning(f"Anomaly detection failed for new transactions: {str(e)}")
                    
            return db_transactions
            
        except HTTPException as e:  # Preserve intended error codes like 400/415
            raise e
        except ValueError as e:  # CSV format/parse errors
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"Error processing CSV upload: {str(e)}")
            raise HTTPException(status_code=500, detail="Error processing CSV upload")
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
        query = db.query(Transaction)

        # Apply search filter
        if search:
            ilike_str = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    func.lower(Transaction.description).ilike(ilike_str),
                    func.lower(Transaction.counterparty_name).ilike(ilike_str)
                )
            )
        # Apply category filter
        if category and category != 'all':
            # Try to match ExpenseCategory or IncomeCategory enums
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
                        Transaction.expense_category == expense_enum,
                        Transaction.income_category == income_enum
                    )
                )
            elif expense_enum:
                query = query.filter(Transaction.expense_category == expense_enum)
            elif income_enum:
                query = query.filter(Transaction.income_category == income_enum)
            else:
                query = query.filter(False)  # No match, return empty
        # Apply date range filter
        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d").date()
                query = query.filter(Transaction.transaction_date >= start)
            except Exception:
                pass
        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d").date()
                query = query.filter(Transaction.transaction_date <= end)
            except Exception:
                pass

        # Add sorting
        if sort_direction == 'asc':
            sort_column = getattr(Transaction, db_sort_field).asc()
        else:
            sort_column = getattr(Transaction, db_sort_field).desc()
        
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
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
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
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id
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
    # Update suggestion index to learn from manual category edits
    try:
        category_suggestion_service.add_transaction(transaction)
    except Exception as e:
        logger.warning(f"Failed to update suggestion index for transaction {transaction.id}: {str(e)}")
    return transaction

@router.post("/restore", response_model=schemas.Transaction)
def restore_transaction(
    transaction_data: schemas.TransactionRestore = Body(...),
    db: Session = Depends(get_db)
):
    try:
        # Create a new transaction with the provided data
        # The ID will be auto-generated, which is fine for our purpose
        new_transaction = Transaction(**transaction_data.dict(exclude={"id"}))
        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)
        
        # Update statistics for the affected period
        StatisticsService.update_statistics(db, new_transaction.transaction_date)
        
        # Run anomaly detection on restored transaction
        try:
            AnomalyDetectionService.detect_anomalies(
                db=db,
                transaction_ids=[new_transaction.id],
                force_redetection=False
            )
        except Exception as e:
            logger.warning(f"Anomaly detection failed for restored transaction: {str(e)}")
        
        return new_transaction
        
    except Exception as e:
        logger.error(f"Error restoring transaction: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
