from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.financial_summary_service import FinancialSummaryService
from ..schemas.financial_summary import FinancialSummaryResponse
import logging

router = APIRouter(
    prefix="/financial-summary",
    tags=["financial-summary"]
)

logger = logging.getLogger(__name__)

@router.get("", response_model=FinancialSummaryResponse)
def get_financial_summary(db: Session = Depends(get_db)):
    """
    Generate a comprehensive, LLM-friendly summary of the user's financial state.
    """
    try:
        summary = FinancialSummaryService.generate_summary(db)
        return summary
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating financial summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error occurred while generating financial summary")
