from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
import logging
from pydantic import BaseModel

from ..database import get_db
from ..models.transaction import TransactionType
from ..services.category_suggestion_service import CategorySuggestionService

# Set up logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/suggestions",
    tags=["suggestions"]
)

# Initialize the service
category_suggestion_service = CategorySuggestionService()

# Schema for the request body
class CategorySuggestionRequest(BaseModel):
    description: str
    amount: float
    transaction_type: TransactionType

@router.post("/category")
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

@router.post("/initialize")
def initialize_category_suggestions(db: Session = Depends(get_db)):
    try:
        category_suggestion_service.train_on_existing_transactions(db)
        return {"message": "Category suggestion model initialized successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
