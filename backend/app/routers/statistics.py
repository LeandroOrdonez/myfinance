from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case, and_
from typing import List, Dict
import logging
from datetime import date, datetime, timedelta
import calendar
import numpy as np
from enum import Enum

from ..database import get_db
from ..models.transaction import Transaction, TransactionType, ExpenseType
from ..models.statistics import FinancialStatistics, CategoryStatistics, StatisticsPeriod
from ..services.statistics_service import StatisticsService

# Set up logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/statistics",
    tags=["statistics"]
)

@router.get("/by-expense-type")
def get_expense_type_statistics(
    db: Session = Depends(get_db),
    period: str = Query("monthly", description="Statistics period (monthly, yearly, all_time)"),
    date: str = Query(None, description="Target date in ISO format (YYYY-MM-DD). Required for monthly/yearly periods.")
):
    """Get statistics aggregated by expense type (essential vs discretionary)"""
    try:
        # Convert period string to enum
        try:
            stat_period = StatisticsPeriod(period)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid period: {period}. Must be one of: monthly, yearly, all_time")
        
        # Get latest transaction date
        latest_transaction = db.query(Transaction).order_by(Transaction.transaction_date.desc()).first()
        
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
            
        # Query category statistics from the database
        query = db.query(CategoryStatistics).filter(
            CategoryStatistics.period == stat_period,
            CategoryStatistics.transaction_type == TransactionType.EXPENSE,
            CategoryStatistics.expense_type != None  # Only get records with expense_type
        )
        
        # Add date filter if needed
        if target_date and stat_period != StatisticsPeriod.ALL_TIME:
            query = query.filter(CategoryStatistics.date == target_date)
        
        # Execute query
        stats = query.all()
        
        if not stats:
            # Return empty results for each expense type
            return [
                {
                    "expense_type": ExpenseType.ESSENTIAL.value,
                    "period": stat_period.value,
                    "date": target_date.isoformat() if target_date else None,
                    "period_amount": 0.0,
                    "period_transaction_count": 0,
                    "period_percentage": 0.0,
                    "total_amount": 0.0,
                    "transaction_count": 0,
                    "total_amount_cumulative": 0.0,
                    "total_transaction_count": 0,
                    "average_transaction_amount": 0.0,
                    "yearly_amount": 0.0,
                    "yearly_transaction_count": 0,
                    "categories": []
                },
                {
                    "expense_type": ExpenseType.DISCRETIONARY.value,
                    "period": stat_period.value,
                    "date": target_date.isoformat() if target_date else None,
                    "period_amount": 0.0,
                    "period_transaction_count": 0,
                    "period_percentage": 0.0,
                    "total_amount": 0.0,
                    "transaction_count": 0,
                    "total_amount_cumulative": 0.0,
                    "total_transaction_count": 0,
                    "average_transaction_amount": 0.0,
                    "yearly_amount": 0.0,
                    "yearly_transaction_count": 0,
                    "categories": []
                }
            ]
        
        # Group by expense type
        essential_stats = [s for s in stats if s.expense_type == ExpenseType.ESSENTIAL]
        discretionary_stats = [s for s in stats if s.expense_type == ExpenseType.DISCRETIONARY]
        
        # Aggregate results by expense type
        results = []
        
        # Process essential expenses
        if essential_stats:
            essential_result = {
                "expense_type": ExpenseType.ESSENTIAL.value,
                "period": stat_period.value,
                "date": essential_stats[0].date.isoformat() if essential_stats[0].date else None,
                "period_amount": sum(float(s.period_amount) for s in essential_stats),
                "period_transaction_count": sum(s.period_transaction_count for s in essential_stats),
                "period_percentage": sum(float(s.period_percentage) for s in essential_stats),
                "total_amount": sum(float(s.period_amount) for s in essential_stats),
                "transaction_count": sum(s.period_transaction_count for s in essential_stats),
                "total_amount_cumulative": sum(float(s.total_amount) for s in essential_stats),
                "total_transaction_count": sum(s.total_transaction_count for s in essential_stats),
                "average_transaction_amount": (sum(float(s.period_amount) for s in essential_stats) / 
                                             sum(s.period_transaction_count for s in essential_stats)) 
                                             if sum(s.period_transaction_count for s in essential_stats) > 0 else 0.0,
                "yearly_amount": sum(float(s.yearly_amount) for s in essential_stats),
                "yearly_transaction_count": sum(s.yearly_transaction_count for s in essential_stats),
                "categories": [{
                    "category": s.category_name,
                    "period_amount": float(s.period_amount),
                    "period_transaction_count": s.period_transaction_count,
                    "period_percentage": float(s.period_percentage)
                } for s in essential_stats]
            }
            results.append(essential_result)
        
        # Process discretionary expenses
        if discretionary_stats:
            discretionary_result = {
                "expense_type": ExpenseType.DISCRETIONARY.value,
                "period": stat_period.value,
                "date": discretionary_stats[0].date.isoformat() if discretionary_stats[0].date else None,
                "period_amount": sum(float(s.period_amount) for s in discretionary_stats),
                "period_transaction_count": sum(s.period_transaction_count for s in discretionary_stats),
                "period_percentage": sum(float(s.period_percentage) for s in discretionary_stats),
                "total_amount": sum(float(s.period_amount) for s in discretionary_stats),
                "transaction_count": sum(s.period_transaction_count for s in discretionary_stats),
                "total_amount_cumulative": sum(float(s.total_amount) for s in discretionary_stats),
                "total_transaction_count": sum(s.total_transaction_count for s in discretionary_stats),
                "average_transaction_amount": (sum(float(s.period_amount) for s in discretionary_stats) / 
                                             sum(s.period_transaction_count for s in discretionary_stats)) 
                                             if sum(s.period_transaction_count for s in discretionary_stats) > 0 else 0.0,
                "yearly_amount": sum(float(s.yearly_amount) for s in discretionary_stats),
                "yearly_transaction_count": sum(s.yearly_transaction_count for s in discretionary_stats),
                "categories": [{
                    "category": s.category_name,
                    "period_amount": float(s.period_amount),
                    "period_transaction_count": s.period_transaction_count,
                    "period_percentage": float(s.period_percentage)
                } for s in discretionary_stats]
            }
            results.append(discretionary_result)
        
        return results
    except Exception as e:
        logger.error(f"Error in get_expense_type_statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-category")
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
        latest_transaction = db.query(Transaction).order_by(Transaction.transaction_date.desc()).first()
        
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

@router.get("/overview")
def get_statistics_overview(db: Session = Depends(get_db)):
    try:
        # Get latest transaction date
        latest_transaction = db.query(Transaction).order_by(Transaction.transaction_date.desc()).first()
        
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

@router.post("/initialize")
def initialize_statistics(db: Session = Depends(get_db)):
    try:
        StatisticsService.initialize_statistics(db)
        StatisticsService.initialize_category_statistics(db)
        return {"message": "Statistics initialized successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/weekday-distribution")
def get_weekday_distribution(
    db: Session = Depends(get_db),
    transaction_type: TransactionType = Query(None, description="Filter by transaction type (expense, income, or both)"),
    start_date: str = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="End date (YYYY-MM-DD)")
):
    try:
        # Build base query
        query = db.query(
            # Extract weekday (0=Monday, 6=Sunday in PostgreSQL)
            extract('dow', Transaction.transaction_date).label('weekday'),
            Transaction.amount,
            Transaction.transaction_type
        )
        
        # Apply date filters if provided
        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d").date()
                query = query.filter(Transaction.transaction_date >= start)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start date format. Use YYYY-MM-DD")
        
        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d").date()
                query = query.filter(Transaction.transaction_date <= end)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end date format. Use YYYY-MM-DD")
        
        # Apply transaction type filter if provided
        if transaction_type:
            if transaction_type == TransactionType.EXPENSE:
                query = query.filter(Transaction.transaction_type == TransactionType.EXPENSE)
            elif transaction_type == TransactionType.INCOME:
                query = query.filter(Transaction.transaction_type == TransactionType.INCOME)
        
        # Execute query to get all transactions with weekday
        transactions = query.all()
        
        if not transactions:
            return {
                "weekdays": [],
                "message": "No transactions found for the specified criteria"
            }
        
        # Process results by weekday
        weekday_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        # Initialize results structure
        results = {}
        for i, day in enumerate(weekday_names):
            results[day] = {
                "expense": {
                    "count": 0,
                    "total": 0,
                    "average": 0,
                    "median": 0,
                    "min": 0,
                    "max": 0,
                    "amounts": []
                },
                "income": {
                    "count": 0,
                    "total": 0,
                    "average": 0,
                    "median": 0,
                    "min": 0,
                    "max": 0,
                    "amounts": []
                }
            }
        
        # Group transactions by weekday and type
        for t in transactions:
            # Convert PostgreSQL's Sunday=0 to Monday=0 format
            weekday_idx = (int(t.weekday) + 6) % 7
            weekday = weekday_names[weekday_idx]
            
            # Determine transaction type and amount
            t_type = "expense" if t.transaction_type == TransactionType.EXPENSE else "income"
            amount = abs(t.amount)  # Use absolute value for calculations
            
            # Add to appropriate category
            results[weekday][t_type]["count"] += 1
            results[weekday][t_type]["total"] += amount
            results[weekday][t_type]["amounts"].append(amount)
        
        # Calculate statistics for each weekday and type
        for day in weekday_names:
            for t_type in ["expense", "income"]:
                amounts = results[day][t_type]["amounts"]
                count = results[day][t_type]["count"]
                
                if count > 0:
                    results[day][t_type]["average"] = round(results[day][t_type]["total"] / count, 2)
                    results[day][t_type]["median"] = round(float(np.median(amounts)), 2) if amounts else 0
                    results[day][t_type]["min"] = round(min(amounts), 2) if amounts else 0
                    results[day][t_type]["max"] = round(max(amounts), 2) if amounts else 0
                
                # Remove the raw amounts array from the response
                del results[day][t_type]["amounts"]
                
                # Round total for better display
                results[day][t_type]["total"] = round(results[day][t_type]["total"], 2)
        
        return {
            "weekdays": results,
            "transaction_count": len(transactions)
        }
    except Exception as e:
        logger.error(f"Error in get_weekday_distribution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/timeseries")
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
