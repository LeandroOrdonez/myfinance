from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from typing import List, Optional
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
import calendar
import logging

from ..database import get_db
from ..models.anomaly import TransactionAnomaly, AnomalyRule, AnomalyStatus, AnomalySeverity, AnomalyType
from ..models.transaction import Transaction
from ..schemas import anomaly as schemas
from ..services.anomaly_detection_service import AnomalyDetectionService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/anomalies",
    tags=["anomalies"]
)

@router.post("/detect", response_model=schemas.AnomalyDetectionResult)
def detect_anomalies(
    request: schemas.AnomalyDetectionRequest = Body(...),
    db: Session = Depends(get_db)
):
    """Run anomaly detection on transactions"""

    start = request.start_date
    end = request.end_date

    # Get the latest transaction date to use as reference for relative time periods
    latest_transaction = db.query(func.max(Transaction.transaction_date)).scalar()
    reference_date = latest_transaction if latest_transaction else date.today()

    # Push the reference date the the last day of the month
    reference_date = reference_date.replace(day=calendar.monthrange(reference_date.year, reference_date.month)[1])
    
    if end is None:
        end = reference_date
    
    if start is None:
        start = reference_date - relativedelta(months=1)
        start = start.replace(day=calendar.monthrange(start.year, start.month)[1]) + timedelta(days=1)
    
    try:
        result = AnomalyDetectionService.detect_anomalies(
            db=db,
            transaction_ids=request.transaction_ids,
            start_date=start,
            end_date=end,
            force_redetection=request.force_redetection
        )
        return result
    except Exception as e:
        logger.error(f"Error detecting anomalies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=schemas.AnomalyPage)
def get_anomalies(
    db: Session = Depends(get_db),
    page: int = Query(1, gt=0),
    page_size: int = Query(20, gt=0, le=100),
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    anomaly_type: Optional[str] = Query(None),
    sort_by: str = Query("detection_timestamp", regex="^(detection_timestamp|anomaly_score|severity)$"),
    sort_direction: str = Query("desc", regex="^(asc|desc)$")
):
    """Get paginated list of anomalies with filters"""
    try:
        query = db.query(TransactionAnomaly).join(Transaction)
        
        # Apply filters - convert string parameters to enums if not empty
        if status and status.strip():
            try:
                status_enum = AnomalyStatus(status)
                query = query.filter(TransactionAnomaly.status == status_enum)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status value: {status}")
        
        if severity and severity.strip():
            try:
                severity_enum = AnomalySeverity(severity)
                query = query.filter(TransactionAnomaly.severity == severity_enum)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid severity value: {severity}")
        
        if anomaly_type and anomaly_type.strip():
            try:
                anomaly_type_enum = AnomalyType(anomaly_type)
                query = query.filter(TransactionAnomaly.anomaly_type == anomaly_type_enum)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid anomaly_type value: {anomaly_type}")
        
        # Apply sorting
        sort_column = getattr(TransactionAnomaly, sort_by)
        if sort_direction == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        anomalies = query.offset(offset).limit(page_size).all()
        
        # Enrich with transaction data
        enriched_anomalies = []
        for anomaly in anomalies:
            anomaly_dict = {
                "id": anomaly.id,
                "transaction_id": anomaly.transaction_id,
                "anomaly_type": anomaly.anomaly_type,
                "severity": anomaly.severity,
                "status": anomaly.status,
                "anomaly_score": anomaly.anomaly_score,
                "confidence": anomaly.confidence,
                "detection_method": anomaly.detection_method,
                "detection_timestamp": anomaly.detection_timestamp,
                "reason": anomaly.reason,
                "details": anomaly.details,
                "expected_value": anomaly.expected_value,
                "actual_value": anomaly.actual_value,
                "deviation_magnitude": anomaly.deviation_magnitude,
                "reviewed_at": anomaly.reviewed_at,
                "reviewed_by": anomaly.reviewed_by,
                "review_notes": anomaly.review_notes,
                "transaction": {
                    "id": anomaly.transaction.id,
                    "transaction_date": anomaly.transaction.transaction_date,
                    "amount": anomaly.transaction.amount,
                    "description": anomaly.transaction.description,
                    "counterparty_name": anomaly.transaction.counterparty_name,
                    "transaction_type": anomaly.transaction.transaction_type,
                    "expense_category": anomaly.transaction.expense_category,
                    "income_category": anomaly.transaction.income_category
                }
            }
            enriched_anomalies.append(anomaly_dict)
        
        return {
            "items": enriched_anomalies,
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size
        }
        
    except Exception as e:
        logger.error(f"Error fetching anomalies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics", response_model=schemas.AnomalyStatistics)
def get_anomaly_statistics(db: Session = Depends(get_db)):
    """Get anomaly detection statistics"""
    try:
        stats = AnomalyDetectionService.get_anomaly_statistics(db)
        return stats
    except Exception as e:
        logger.error(f"Error fetching anomaly statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{anomaly_id}/status", response_model=schemas.Anomaly)
def update_anomaly_status(
    anomaly_id: int,
    update_data: schemas.AnomalyUpdate = Body(...),
    db: Session = Depends(get_db)
):
    """Update anomaly review status"""
    try:
        if not update_data.status:
            raise HTTPException(status_code=400, detail="Status is required")
            
        anomaly = AnomalyDetectionService.update_anomaly_status(
            db=db,
            anomaly_id=anomaly_id,
            status=update_data.status,
            review_notes=update_data.review_notes
        )
        return anomaly
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating anomaly status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{anomaly_id}", response_model=schemas.AnomalyWithTransaction)
def get_anomaly_detail(
    anomaly_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific anomaly"""
    try:
        anomaly = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.id == anomaly_id
        ).first()
        
        if not anomaly:
            raise HTTPException(status_code=404, detail="Anomaly not found")
        
        return {
            "id": anomaly.id,
            "transaction_id": anomaly.transaction_id,
            "anomaly_type": anomaly.anomaly_type,
            "severity": anomaly.severity,
            "status": anomaly.status,
            "anomaly_score": anomaly.anomaly_score,
            "confidence": anomaly.confidence,
            "detection_method": anomaly.detection_method,
            "detection_timestamp": anomaly.detection_timestamp,
            "reason": anomaly.reason,
            "details": anomaly.details,
            "expected_value": anomaly.expected_value,
            "actual_value": anomaly.actual_value,
            "deviation_magnitude": anomaly.deviation_magnitude,
            "reviewed_at": anomaly.reviewed_at,
            "reviewed_by": anomaly.reviewed_by,
            "review_notes": anomaly.review_notes,
            "transaction": {
                "id": anomaly.transaction.id,
                "account_number": anomaly.transaction.account_number,
                "transaction_date": anomaly.transaction.transaction_date,
                "amount": anomaly.transaction.amount,
                "currency": anomaly.transaction.currency,
                "description": anomaly.transaction.description,
                "counterparty_name": anomaly.transaction.counterparty_name,
                "counterparty_account": anomaly.transaction.counterparty_account,
                "transaction_type": anomaly.transaction.transaction_type,
                "expense_category": anomaly.transaction.expense_category,
                "income_category": anomaly.transaction.income_category,
                "source_bank": anomaly.transaction.source_bank
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching anomaly detail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{anomaly_id}")
def delete_anomaly(
    anomaly_id: int,
    db: Session = Depends(get_db)
):
    """Delete an anomaly (mark as false positive)"""
    try:
        anomaly = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.id == anomaly_id
        ).first()
        
        if not anomaly:
            raise HTTPException(status_code=404, detail="Anomaly not found")
        
        # Mark as false positive instead of deleting
        anomaly.status = AnomalyStatus.FALSE_POSITIVE
        anomaly.reviewed_at = datetime.utcnow()
        
        db.commit()
        
        return {"message": "Anomaly marked as false positive"}
        
    except Exception as e:
        logger.error(f"Error deleting anomaly: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Anomaly Rules endpoints
@router.get("/rules/", response_model=List[schemas.AnomalyRule])
def get_anomaly_rules(db: Session = Depends(get_db)):
    """Get all anomaly detection rules"""
    try:
        rules = db.query(AnomalyRule).filter(AnomalyRule.is_active == True).all()
        return rules
    except Exception as e:
        logger.error(f"Error fetching anomaly rules: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rules/", response_model=schemas.AnomalyRule)
def create_anomaly_rule(
    rule_data: schemas.AnomalyRuleCreate = Body(...),
    db: Session = Depends(get_db)
):
    """Create a new anomaly detection rule"""
    try:
        rule = AnomalyRule(**rule_data.dict())
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule
    except Exception as e:
        logger.error(f"Error creating anomaly rule: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/rules/{rule_id}", response_model=schemas.AnomalyRule)
def update_anomaly_rule(
    rule_id: int,
    rule_data: schemas.AnomalyRuleUpdate = Body(...),
    db: Session = Depends(get_db)
):
    """Update an anomaly detection rule"""
    try:
        rule = db.query(AnomalyRule).filter(AnomalyRule.id == rule_id).first()
        
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        update_data = rule_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(rule, field, value)
        
        rule.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(rule)
        
        return rule
    except Exception as e:
        logger.error(f"Error updating anomaly rule: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/rules/{rule_id}")
def delete_anomaly_rule(
    rule_id: int,
    db: Session = Depends(get_db)
):
    """Delete an anomaly detection rule"""
    try:
        rule = db.query(AnomalyRule).filter(AnomalyRule.id == rule_id).first()
        
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        rule.is_active = False
        rule.updated_at = datetime.utcnow()
        db.commit()
        
        return {"message": "Rule deactivated successfully"}
    except Exception as e:
        logger.error(f"Error deleting anomaly rule: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
