from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import List

from ..database import get_db
from ..models.statistics import StatisticsPeriod
from ..schemas.financial_health import (
    FinancialHealthScoreOut, RecommendationOut, RecommendationProgressUpdate,
    HealthGoalCreate, HealthGoalOut
)
from ..services.financial_health_service import FinancialHealthService

router = APIRouter(
    prefix="/health",
    tags=["financial_health"]
)

@router.get("/score", response_model=FinancialHealthScoreOut)
async def get_health_score(
    period: str = Query("monthly"), date_str: str = Query(None), db: Session = Depends(get_db)
):
    # Convert period
    try:
        stat_period = StatisticsPeriod(period)
    except ValueError:
        raise HTTPException(400, f"Invalid period {period}")
    target_date = date.fromisoformat(date_str) if date_str else None
    fh = FinancialHealthService.compute_health_score(db, stat_period, target_date)
    return fh

@router.get("/history", response_model=List[FinancialHealthScoreOut])
async def get_health_history(
    period: str = Query("monthly"), start: str = Query(None), end: str = Query(None), db: Session = Depends(get_db)
):
    try:
        stat_period = StatisticsPeriod(period)
    except ValueError:
        raise HTTPException(400, f"Invalid period {period}")
    start_date = date.fromisoformat(start) if start else None
    end_date = date.fromisoformat(end) if end else None
    return FinancialHealthService.get_history(db, stat_period, start_date, end_date)

@router.get("/recommendations", response_model=List[RecommendationOut])
async def list_recommendations(db: Session = Depends(get_db)):
    return FinancialHealthService.list_recommendations(db)

@router.patch("/recommendations/{rec_id}", response_model=RecommendationOut)
async def update_recommendation_progress(
    rec_id: int, payload: RecommendationProgressUpdate, db: Session = Depends(get_db)
):
    rec = FinancialHealthService.update_recommendation_progress(db, rec_id, payload.progress)
    if not rec:
        raise HTTPException(404, "Recommendation not found")
    return rec

@router.get("/goals", response_model=List[HealthGoalOut])
async def list_goals(db: Session = Depends(get_db)):
    return FinancialHealthService.list_goals(db)

@router.post("/goals", response_model=HealthGoalOut)
async def create_goal(
    payload: HealthGoalCreate, db: Session = Depends(get_db)
):
    return FinancialHealthService.create_goal(db, payload.metric, payload.target_value)

@router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = FinancialHealthService.delete_goal(db, goal_id)
    if not goal:
        raise HTTPException(404, "Goal not found")
    return {"message": "Deleted"}
