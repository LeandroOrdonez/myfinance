from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
import logging

from ..database import get_db
from ..models.transaction import Transaction
from ..models.financial_health import FinancialHealth, FinancialRecommendation
from ..schemas import financial_health as schemas
from ..services.financial_health_service import FinancialHealthService

# Set up logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/financial-health",
    tags=["financial-health"]
)

@router.get("/score", response_model=schemas.FinancialHealth)
def get_health_score(
    target_date: Optional[str] = Query(None, description="Target date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Get the financial health score for a specific date.
    If no date is provided, uses the date from the latest available transaction.
    """
    try:
        if target_date:
            date_obj = datetime.strptime(target_date, "%Y-%m-%d").date()
        else:
            latest_transaction = db.query(Transaction).order_by(Transaction.transaction_date.desc()).first()
            date_obj = latest_transaction.transaction_date if latest_transaction else date.today()
            
        health_score = FinancialHealthService.calculate_health_score(db, date_obj)
        return health_score
    except Exception as e:
        logger.error(f"Error calculating financial health score: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history", response_model=schemas.FinancialHealthHistory)
def get_health_history(
    months: int = Query(12, gt=0, le=60, description="Number of months of history to retrieve"),
    db: Session = Depends(get_db)
):
    """
    Get historical financial health scores for the specified number of months.
    """
    try:
        history = FinancialHealthService.get_health_history(db, months)
        return history
    except Exception as e:
        logger.error(f"Error retrieving financial health history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recommendations", response_model=List[schemas.Recommendation])
def get_recommendations(
    active_only: bool = Query(True, description="Only return active (not completed) recommendations"),
    db: Session = Depends(get_db)
):
    """
    Get personalized financial recommendations.
    """
    try:
        recommendations = FinancialHealthService.get_recommendations(db, active_only)
        return recommendations
    except Exception as e:
        logger.error(f"Error retrieving recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/recommendations/{recommendation_id}", response_model=schemas.Recommendation)
def update_recommendation(
    recommendation_id: int,
    update_data: schemas.RecommendationUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a recommendation's completion status.
    """
    try:
        updated_recommendation = FinancialHealthService.update_recommendation(
            db, recommendation_id, update_data.is_completed
        )
        
        if not updated_recommendation:
            raise HTTPException(status_code=404, detail="Recommendation not found")
            
        return updated_recommendation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating recommendation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recalculate", response_model=schemas.FinancialHealth)
def recalculate_health_score(
    target_date: Optional[str] = Query(None, description="Target date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Force recalculation of the financial health score for a specific date.
    If no date is provided, uses the current month.
    """
    try:
        if target_date:
            date_obj = datetime.strptime(target_date, "%Y-%m-%d").date()
        else:
            date_obj = date.today()
            
        # Delete existing score for the month if it exists
        month_start = date_obj.replace(day=1)
        month_end = date_obj.replace(day=31)  # This will work even for months with fewer days
        
        db.query(FinancialHealth).filter(
            FinancialHealth.date >= month_start,
            FinancialHealth.date <= month_end
        ).delete()
        
        db.commit()
        
        # Calculate new score
        health_score = FinancialHealthService.calculate_health_score(db, date_obj)
        return health_score
    except Exception as e:
        logger.error(f"Error recalculating financial health score: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
