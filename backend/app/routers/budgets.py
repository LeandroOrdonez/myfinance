from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
import logging

from ..database import get_db
from ..schemas import budget as schemas
from ..services.budget_service import (
    BudgetService,
    DuplicateBudgetError,
    InvalidCategoryError,
    DEFAULT_SUGGESTION_PERCENTILE,
    DEFAULT_LOOKBACK_MONTHS,
)

# Set up logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/budgets",
    tags=["budgets"]
)


@router.get("/", response_model=List[schemas.Budget])
def get_budgets(db: Session = Depends(get_db)):
    """Get all active budgets."""
    try:
        return BudgetService.get_budgets(db)
    except Exception as e:
        logger.error(f"Error retrieving budgets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=schemas.Budget, status_code=201)
def create_budget(data: schemas.BudgetCreate, db: Session = Depends(get_db)):
    """Create a budget for an expense category."""
    try:
        return BudgetService.create_budget(db, data)
    except DuplicateBudgetError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except InvalidCategoryError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating budget: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/progress", response_model=List[schemas.BudgetProgress])
def get_progress(
    target_date: Optional[str] = Query(None, description="Target date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """Get spending progress against each active budget for the target month."""
    try:
        date_obj = (
            datetime.strptime(target_date, "%Y-%m-%d").date() if target_date else None
        )
        return BudgetService.get_progress(db, date_obj)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error retrieving budget progress: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestion", response_model=schemas.BudgetSuggestion)
def get_suggestion(
    category: str = Query(..., description="Expense category to suggest a limit for"),
    percentile: float = Query(DEFAULT_SUGGESTION_PERCENTILE, ge=0, le=100),
    months: int = Query(DEFAULT_LOOKBACK_MONTHS, gt=0, le=36),
    db: Session = Depends(get_db)
):
    """Suggest a monthly limit based on a percentile of historical monthly spend."""
    try:
        return BudgetService.suggest_limit(db, category, percentile, months)
    except InvalidCategoryError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error computing budget suggestion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{budget_id}", response_model=schemas.Budget)
def update_budget(
    budget_id: int,
    data: schemas.BudgetUpdate,
    db: Session = Depends(get_db)
):
    """Update a budget's limit or active state."""
    try:
        updated = BudgetService.update_budget(db, budget_id, data)
        if not updated:
            raise HTTPException(status_code=404, detail="Budget not found")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating budget: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{budget_id}")
def delete_budget(budget_id: int, db: Session = Depends(get_db)):
    """Delete a budget."""
    try:
        deleted = BudgetService.delete_budget(db, budget_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Budget not found")
        return {"detail": "Budget deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting budget: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
