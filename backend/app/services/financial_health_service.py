from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_, desc, text
from datetime import date, datetime, timedelta
import calendar
import numpy as np
import logging
from typing import List, Dict, Optional, Tuple

from ..models.transaction import Transaction, TransactionType, ExpenseCategory
from ..models.statistics import FinancialStatistics, CategoryStatistics, StatisticsPeriod
from ..models.financial_health import FinancialHealth, FinancialRecommendation

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FinancialHealthService:
    """Service for calculating and managing financial health metrics"""
    
    # Thresholds for scoring components (these could be made configurable)
    THRESHOLDS = {
        "savings_rate": {
            "excellent": 0.20,  # 20% or more is excellent
            "good": 0.15,       # 15-20% is good
            "average": 0.10,    # 10-15% is average
            "poor": 0.05,       # 5-10% is poor
            "critical": 0.0     # Less than 5% is critical
        },
        "expense_ratio": {
            "excellent": 0.60,  # 60% or less is excellent
            "good": 0.70,       # 60-70% is good
            "average": 0.80,    # 70-80% is average
            "poor": 0.90,       # 80-90% is poor
            "critical": 1.0     # More than 90% is critical
        },
        "emergency_fund": {
            "excellent": 6.0,   # 6+ months is excellent
            "good": 4.0,        # 4-6 months is good
            "average": 3.0,     # 3-4 months is average
            "poor": 1.0,        # 1-3 months is poor
            "critical": 0.0     # Less than 1 month is critical
        },
        "debt_to_income": {
            "excellent": 0.20,  # Less than 20% is excellent
            "good": 0.30,       # 20-30% is good
            "average": 0.36,    # 30-36% is average
            "poor": 0.43,       # 36-43% is poor
            "critical": 0.50    # More than 43% is critical
        }
    }
    
    @staticmethod
    def calculate_health_score(db: Session, target_date: date = None, force: bool = False) -> FinancialHealth:
        """Calculate the financial health score for a given date
        
        Args:
            db: Database session
            target_date: The date to calculate the score for (defaults to today)
            force: If True, recalculate even if a score already exists for this month
            
        Returns:
            The financial health score object
        """
        if target_date is None:
            target_date = date.today()
            
        # Get the last day of the month for the target date
        last_day = target_date.replace(day=calendar.monthrange(target_date.year, target_date.month)[1])
        
        # Check if we already have a health score for this month
        existing_score = db.query(FinancialHealth).filter(
            extract('year', FinancialHealth.date) == target_date.year,
            extract('month', FinancialHealth.date) == target_date.month
        ).first()
        
        if existing_score and not force:
            return existing_score
            
        # If we're forcing recalculation and a score exists, delete it
        if existing_score and force:
            db.delete(existing_score)
            db.flush()
            
        # Get financial statistics for the month
        monthly_stats = db.query(FinancialStatistics).filter(
            FinancialStatistics.period == StatisticsPeriod.MONTHLY,
            extract('year', FinancialStatistics.date) == target_date.year,
            extract('month', FinancialStatistics.date) == target_date.month
        ).first()
        
        if not monthly_stats:
            logger.warning(f"No monthly statistics found for {target_date}. Creating empty health score.")
            health_score = FinancialHealth(
                date=last_day,
                overall_score=0,
                savings_rate_score=0,
                expense_ratio_score=0,
                budget_adherence_score=0,
                debt_to_income_score=0,
                emergency_fund_score=0,
                spending_stability_score=0,
                savings_rate=0,
                expense_ratio=0,
                budget_adherence=0,
                debt_to_income=0,
                emergency_fund_months=0,
                spending_stability=0,
                recommendations=[]
            )
            db.add(health_score)
            db.commit()
            db.refresh(health_score)
            return health_score
        
        # Calculate component scores
        
        # 1. Savings Rate Score
        savings_rate = monthly_stats.savings_rate / 100  # Convert from percentage to decimal
        savings_rate_score = FinancialHealthService._score_component(
            savings_rate, 
            FinancialHealthService.THRESHOLDS["savings_rate"],
            higher_is_better=True
        )
        
        # 2. Expense Ratio Score
        if monthly_stats.period_income > 0:
            expense_ratio = monthly_stats.period_expenses / monthly_stats.period_income
        else:
            expense_ratio = 1.0  # If no income, expense ratio is 100%
            
        expense_ratio_score = FinancialHealthService._score_component(
            expense_ratio,
            FinancialHealthService.THRESHOLDS["expense_ratio"],
            higher_is_better=False
        )
        
        # 3. Budget Adherence Score
        budget_adherence_score, budget_adherence = FinancialHealthService._calculate_budget_adherence(
            db, target_date
        )
        
        # 4. Debt-to-Income Score
        debt_to_income_score, debt_to_income = FinancialHealthService._calculate_debt_to_income(
            db, target_date
        )
        
        # 5. Emergency Fund Score
        emergency_fund_score, emergency_fund_months = FinancialHealthService._calculate_emergency_fund(
            db, target_date
        )
        
        # 6. Spending Stability Score
        spending_stability_score, spending_stability = FinancialHealthService._calculate_spending_stability(
            db, target_date
        )
        
        # Calculate overall score (weighted average)
        weights = {
            "savings_rate": 0.25,
            "expense_ratio": 0.20,
            "budget_adherence": 0.15,
            "debt_to_income": 0.15,
            "emergency_fund": 0.15,
            "spending_stability": 0.10
        }
        
        overall_score = (
            savings_rate_score * weights["savings_rate"] +
            expense_ratio_score * weights["expense_ratio"] +
            budget_adherence_score * weights["budget_adherence"] +
            debt_to_income_score * weights["debt_to_income"] +
            emergency_fund_score * weights["emergency_fund"] +
            spending_stability_score * weights["spending_stability"]
        )
        
        # Generate recommendations
        recommendations = FinancialHealthService._generate_recommendations(
            savings_rate_score, expense_ratio_score, budget_adherence_score,
            debt_to_income_score, emergency_fund_score, spending_stability_score,
            savings_rate, expense_ratio, budget_adherence, debt_to_income,
            emergency_fund_months, spending_stability
        )
        
        # Create and save the financial health record
        health_score = FinancialHealth(
            date=last_day,
            overall_score=overall_score,
            savings_rate_score=savings_rate_score,
            expense_ratio_score=expense_ratio_score,
            budget_adherence_score=budget_adherence_score,
            debt_to_income_score=debt_to_income_score,
            emergency_fund_score=emergency_fund_score,
            spending_stability_score=spending_stability_score,
            savings_rate=savings_rate,
            expense_ratio=expense_ratio,
            budget_adherence=budget_adherence,
            debt_to_income=debt_to_income,
            emergency_fund_months=emergency_fund_months,
            spending_stability=spending_stability,
            recommendations=recommendations
        )
        
        db.add(health_score)
        db.commit()
        db.refresh(health_score)
        
        return health_score
    
    @staticmethod
    def get_health_history(db: Session, months: int = 12) -> Dict:
        """Get historical health scores for the specified number of months"""
        today = date.today()
        start_date = today.replace(day=1) - timedelta(days=months*31)  # Approximate
        
        health_scores = db.query(FinancialHealth).filter(
            FinancialHealth.date >= start_date
        ).order_by(FinancialHealth.date).all()
        
        history = {
            "dates": [],
            "overall_scores": [],
            "savings_rate_scores": [],
            "expense_ratio_scores": [],
            "budget_adherence_scores": [],
            "debt_to_income_scores": [],
            "emergency_fund_scores": [],
            "spending_stability_scores": []
        }
        
        for score in health_scores:
            history["dates"].append(score.date)
            history["overall_scores"].append(score.overall_score)
            history["savings_rate_scores"].append(score.savings_rate_score)
            history["expense_ratio_scores"].append(score.expense_ratio_score)
            history["budget_adherence_scores"].append(score.budget_adherence_score)
            history["debt_to_income_scores"].append(score.debt_to_income_score)
            history["emergency_fund_scores"].append(score.emergency_fund_score)
            history["spending_stability_scores"].append(score.spending_stability_score)
        
        return history
    
    @staticmethod
    def get_recommendations(db: Session, active_only: bool = True) -> List[FinancialRecommendation]:
        """Get active recommendations sorted by priority"""
        query = db.query(FinancialRecommendation)
        
        if active_only:
            query = query.filter(FinancialRecommendation.is_completed == False)
            
        return query.order_by(desc(FinancialRecommendation.priority)).all()
    
    @staticmethod
    def update_recommendation(db: Session, recommendation_id: int, is_completed: bool) -> FinancialRecommendation:
        """Mark a recommendation as completed or not completed"""
        recommendation = db.query(FinancialRecommendation).filter(
            FinancialRecommendation.id == recommendation_id
        ).first()
        
        if not recommendation:
            return None
            
        recommendation.is_completed = is_completed
        recommendation.date_completed = date.today() if is_completed else None
        
        db.commit()
        db.refresh(recommendation)
        
        return recommendation
        
    @staticmethod
    def initialize_financial_health(db: Session):
        """Initialize financial health scores for all historical months with transactions"""
        try:
            logger.info("Initializing financial health scores for all historical data...")
            # Lock the database to prevent any concurrent modifications during initialization
            db.execute(text("BEGIN"))
            
            # Clear existing financial health scores
            db.query(FinancialHealth).delete()
            db.flush()
            
            # Get all unique months from transactions
            months = db.query(
                extract('year', Transaction.transaction_date).label('year'),
                extract('month', Transaction.transaction_date).label('month')
            ).distinct().all()
            
            if not months:
                logger.info("No transaction data found for financial health initialization")
                db.commit()
                return
                
            logger.info(f"Found {len(months)} months with transaction data")
            
            # Calculate health scores for each month
            for year, month in months:
                # Set day to the last day of the month
                last_day = date(year=int(year), month=int(month), 
                               day=calendar.monthrange(int(year), int(month))[1])
                
                logger.info(f"Calculating financial health score for {last_day}")
                
                try:
                    # Calculate health score for this month
                    # We're passing force=True to ensure calculation even if statistics aren't perfect
                    FinancialHealthService.calculate_health_score(db, last_day, force=True)
                except Exception as e:
                    logger.warning(f"Error calculating health score for {last_day}: {str(e)}")
                    # Continue with other months even if one fails
                    continue
            
            db.commit()
            logger.info("Financial health initialization completed successfully")
        except Exception as e:
            db.rollback()
            logger.error(f"Error initializing financial health scores: {str(e)}")
            raise e
    
    @staticmethod
    def _score_component(value: float, thresholds: Dict[str, float], higher_is_better: bool) -> float:
        """
        Convert a raw metric to a 0-100 score based on thresholds
        
        Args:
            value: The raw metric value
            thresholds: Dictionary of thresholds with keys 'excellent', 'good', 'average', 'poor', 'critical'
            higher_is_better: Whether higher values are better (True) or worse (False)
            
        Returns:
            A score between 0 and 100
        """
        # Define score ranges
        score_ranges = {
            "excellent": (80, 100),
            "good": (60, 80),
            "average": (40, 60),
            "poor": (20, 40),
            "critical": (0, 20)
        }
        
        # Determine which threshold range the value falls into
        if higher_is_better:
            if value >= thresholds["excellent"]:
                category = "excellent"
            elif value >= thresholds["good"]:
                category = "good"
            elif value >= thresholds["average"]:
                category = "average"
            elif value >= thresholds["poor"]:
                category = "poor"
            else:
                category = "critical"
        else:
            if value <= thresholds["excellent"]:
                category = "excellent"
            elif value <= thresholds["good"]:
                category = "good"
            elif value <= thresholds["average"]:
                category = "average"
            elif value <= thresholds["poor"]:
                category = "poor"
            else:
                category = "critical"
        
        # Get the score range for this category
        low_score, high_score = score_ranges[category]
        
        # For more granular scoring within the range, interpolate based on where the value
        # falls within the threshold range
        if category == "excellent":
            # Already at the top range
            return high_score - (high_score - low_score) * 0.5  # Middle of range
        
        # Determine the threshold bounds for interpolation
        if higher_is_better:
            lower_bound = thresholds[category]
            if category == "critical":
                upper_bound = lower_bound  # No lower bound for critical
                return low_score  # Just return the low score for critical
            else:
                next_category = {"good": "excellent", "average": "good", "poor": "average", "critical": "poor"}[category]
                upper_bound = thresholds[next_category]
                
            # Calculate position within range (0 to 1)
            if upper_bound == lower_bound:
                position = 0.5  # Avoid division by zero
            else:
                position = (value - lower_bound) / (upper_bound - lower_bound)
        else:
            upper_bound = thresholds[category]
            if category == "critical":
                lower_bound = upper_bound * 2  # Arbitrary higher bound for critical
                return low_score  # Just return the low score for critical
            else:
                next_category = {"good": "excellent", "average": "good", "poor": "average", "critical": "poor"}[category]
                lower_bound = thresholds[next_category]
                
            # Calculate position within range (0 to 1)
            if upper_bound == lower_bound:
                position = 0.5  # Avoid division by zero
            else:
                position = (upper_bound - value) / (upper_bound - lower_bound)
        
        # Clamp position between 0 and 1
        position = max(0, min(1, position))
        
        # Interpolate within the score range
        return low_score + position * (high_score - low_score)
    
    @staticmethod
    def _calculate_budget_adherence(db: Session, target_date: date) -> Tuple[float, float]:
        """
        Calculate budget adherence score based on how well spending stays within
        historical averages for each category
        
        Returns:
            Tuple of (score, adherence_percentage)
        """
        # Get the month's expense transactions
        month_start = target_date.replace(day=1)
        month_end = target_date.replace(day=calendar.monthrange(target_date.year, target_date.month)[1])
        
        # Get all expense transactions for the month
        month_expenses = db.query(Transaction).filter(
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.transaction_date >= month_start,
            Transaction.transaction_date <= month_end
        ).all()
        
        if not month_expenses:
            return 50.0, 0.5  # Default to middle score if no expenses
        
        # Get category statistics for the previous 3 months
        three_months_ago = month_start - timedelta(days=90)
        
        category_stats = db.query(CategoryStatistics).filter(
            CategoryStatistics.transaction_type == TransactionType.EXPENSE,
            CategoryStatistics.period == StatisticsPeriod.MONTHLY,
            CategoryStatistics.date >= three_months_ago,
            CategoryStatistics.date < month_start
        ).all()
        
        if not category_stats:
            return 50.0, 0.5  # Default to middle score if no historical data
        
        # Calculate average monthly spending by category
        category_averages = {}
        for stat in category_stats:
            if stat.category_name not in category_averages:
                category_averages[stat.category_name] = []
            category_averages[stat.category_name].append(stat.period_amount)
        
        # Calculate the average for each category
        for category, amounts in category_averages.items():
            category_averages[category] = sum(amounts) / len(amounts) if amounts else 0
        
        # Calculate current month spending by category
        current_spending = {}
        for expense in month_expenses:
            category = expense.expense_category.value if expense.expense_category else "Others"
            if category not in current_spending:
                current_spending[category] = 0
            current_spending[category] += abs(expense.amount)
        
        # Calculate deviation from average for each category
        deviations = []
        for category, amount in current_spending.items():
            average = category_averages.get(category, amount)  # If no history, use current amount
            if average > 0:
                deviation = abs(amount - average) / average
                deviations.append(deviation)
        
        if not deviations:
            return 50.0, 0.5  # Default to middle score if no deviations
        
        # Calculate average deviation (lower is better)
        avg_deviation = sum(deviations) / len(deviations)
        
        # Convert to adherence percentage (higher is better)
        adherence = max(0, 1 - avg_deviation)
        
        # Score the adherence
        adherence_score = FinancialHealthService._score_component(
            adherence,
            {
                "excellent": 0.90,  # Less than 10% deviation
                "good": 0.80,       # 10-20% deviation
                "average": 0.70,    # 20-30% deviation
                "poor": 0.50,       # 30-50% deviation
                "critical": 0.0     # More than 50% deviation
            },
            higher_is_better=True
        )
        
        return adherence_score, adherence
    
    @staticmethod
    def _calculate_debt_to_income(db: Session, target_date: date) -> Tuple[float, float]:
        """
        Calculate debt-to-income ratio score
        
        Returns:
            Tuple of (score, debt_to_income_ratio)
        """
        # For now, we'll use a simplified approach based on transactions with "Debt" category
        month_start = target_date.replace(day=1)
        month_end = target_date.replace(day=calendar.monthrange(target_date.year, target_date.month)[1])
        
        # Get all debt payments for the month
        debt_payments = db.query(func.sum(Transaction.amount)).filter(
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.expense_category == ExpenseCategory.DEBT,
            Transaction.transaction_date >= month_start,
            Transaction.transaction_date <= month_end
        ).scalar() or 0
        
        # Get total income for the month
        total_income = db.query(func.sum(Transaction.amount)).filter(
            Transaction.transaction_type == TransactionType.INCOME,
            Transaction.transaction_date >= month_start,
            Transaction.transaction_date <= month_end
        ).scalar() or 0
        
        # Calculate debt-to-income ratio
        if total_income > 0:
            debt_to_income = abs(debt_payments) / total_income
        else:
            debt_to_income = 1.0  # If no income, assume worst case
        
        # Score the debt-to-income ratio
        debt_to_income_score = FinancialHealthService._score_component(
            debt_to_income,
            FinancialHealthService.THRESHOLDS["debt_to_income"],
            higher_is_better=False
        )
        
        return debt_to_income_score, debt_to_income
    
    @staticmethod
    def _calculate_emergency_fund(db: Session, target_date: date) -> Tuple[float, float]:
        """
        Calculate emergency fund score based on savings relative to monthly expenses
        
        Returns:
            Tuple of (score, emergency_fund_months)
        """
        # Get average monthly expenses over the last 6 months
        six_months_ago = target_date - timedelta(days=180)
        
        avg_monthly_expense = db.query(func.avg(FinancialStatistics.period_expenses)).filter(
            FinancialStatistics.period == StatisticsPeriod.MONTHLY,
            FinancialStatistics.date >= six_months_ago,
            FinancialStatistics.date <= target_date
        ).scalar() or 0
        
        # Estimate emergency fund from total savings
        # This is a simplified approach - in a real app, you might have a specific
        # emergency fund account or category
        total_savings = db.query(FinancialStatistics).filter(
            FinancialStatistics.period == StatisticsPeriod.ALL_TIME
        ).first()
        
        if total_savings and avg_monthly_expense > 0:
            emergency_fund_months = total_savings.total_net_savings / avg_monthly_expense
        else:
            emergency_fund_months = 0
        
        # Cap at reasonable maximum for scoring
        emergency_fund_months = min(emergency_fund_months, 12)
        
        # Score the emergency fund
        emergency_fund_score = FinancialHealthService._score_component(
            emergency_fund_months,
            FinancialHealthService.THRESHOLDS["emergency_fund"],
            higher_is_better=True
        )
        
        return emergency_fund_score, emergency_fund_months
    
    @staticmethod
    def _calculate_spending_stability(db: Session, target_date: date) -> Tuple[float, float]:
        """
        Calculate spending stability score based on consistency of spending patterns
        
        Returns:
            Tuple of (score, stability_coefficient)
        """
        # Get monthly expenses for the last 6 months
        six_months_ago = target_date - timedelta(days=180)
        
        monthly_expenses = db.query(FinancialStatistics.period_expenses).filter(
            FinancialStatistics.period == StatisticsPeriod.MONTHLY,
            FinancialStatistics.date >= six_months_ago,
            FinancialStatistics.date <= target_date
        ).all()
        
        if not monthly_expenses or len(monthly_expenses) < 3:
            return 50.0, 0.5  # Default to middle score if insufficient data
        
        # Calculate coefficient of variation (standard deviation / mean)
        expenses = [expense[0] for expense in monthly_expenses]
        mean = sum(expenses) / len(expenses)
        
        if mean == 0:
            return 50.0, 0.5  # Avoid division by zero
            
        variance = sum((x - mean) ** 2 for x in expenses) / len(expenses)
        std_dev = variance ** 0.5
        
        coefficient_of_variation = std_dev / mean
        
        # Convert to stability (lower coefficient = higher stability)
        stability = max(0, 1 - coefficient_of_variation)
        
        # Score the stability
        stability_score = FinancialHealthService._score_component(
            stability,
            {
                "excellent": 0.90,  # Very stable (less than 10% variation)
                "good": 0.80,       # Stable (10-20% variation)
                "average": 0.70,    # Somewhat stable (20-30% variation)
                "poor": 0.50,       # Unstable (30-50% variation)
                "critical": 0.0     # Very unstable (more than 50% variation)
            },
            higher_is_better=True
        )
        
        return stability_score, stability
    
    @staticmethod
    def _generate_recommendations(
        savings_rate_score: float, expense_ratio_score: float, 
        budget_adherence_score: float, debt_to_income_score: float,
        emergency_fund_score: float, spending_stability_score: float,
        savings_rate: float, expense_ratio: float,
        budget_adherence: float, debt_to_income: float,
        emergency_fund_months: float, spending_stability: float
    ) -> List[Dict]:
        """Generate personalized recommendations based on financial health scores"""
        recommendations = []
        
        # Add recommendations for low scores
        if savings_rate_score < 40:
            recommendations.append({
                "title": "Increase Your Savings Rate",
                "description": f"Your current savings rate is {savings_rate:.1%}, which is below recommended levels. Aim to save at least 15% of your income.",
                "category": "savings_rate",
                "impact_area": "Savings Rate",
                "priority": 5,
                "estimated_score_improvement": 20
            })
            
            # Add specific tactics
            recommendations.append({
                "title": "Implement the 50/30/20 Budget Rule",
                "description": "Allocate 50% of income to needs, 30% to wants, and 20% to savings and debt repayment.",
                "category": "savings_rate",
                "impact_area": "Savings Rate",
                "priority": 4,
                "estimated_score_improvement": 15
            })
        
        if expense_ratio_score < 40:
            recommendations.append({
                "title": "Reduce Your Expense-to-Income Ratio",
                "description": f"Your expenses are {expense_ratio:.1%} of your income, which is higher than recommended. Try to keep expenses below 70% of income.",
                "category": "expense_ratio",
                "impact_area": "Expense Ratio",
                "priority": 5,
                "estimated_score_improvement": 20
            })
            
            # Add specific tactics
            recommendations.append({
                "title": "Review Subscriptions and Recurring Expenses",
                "description": "Cancel unused subscriptions and negotiate bills to quickly reduce monthly expenses.",
                "category": "expense_ratio",
                "impact_area": "Expense Ratio",
                "priority": 4,
                "estimated_score_improvement": 10
            })
        
        if budget_adherence_score < 40:
            recommendations.append({
                "title": "Improve Budget Consistency",
                "description": "Your spending varies significantly from your typical patterns. Track expenses more closely to stay within category budgets.",
                "category": "budget_adherence",
                "impact_area": "Budget Adherence",
                "priority": 3,
                "estimated_score_improvement": 15
            })
        
        if debt_to_income_score < 40:
            recommendations.append({
                "title": "Reduce Debt-to-Income Ratio",
                "description": f"Your debt payments are {debt_to_income:.1%} of your income, which is higher than recommended. Aim to keep this below 30%.",
                "category": "debt_to_income",
                "impact_area": "Debt-to-Income Ratio",
                "priority": 4,
                "estimated_score_improvement": 15
            })
            
            # Add specific tactics
            if debt_to_income > 0.4:
                recommendations.append({
                    "title": "Consider Debt Consolidation",
                    "description": "Consolidating high-interest debt can lower monthly payments and reduce total interest paid.",
                    "category": "debt_to_income",
                    "impact_area": "Debt-to-Income Ratio",
                    "priority": 5,
                    "estimated_score_improvement": 10
                })
        
        if emergency_fund_score < 40:
            recommendations.append({
                "title": "Build Your Emergency Fund",
                "description": f"You have approximately {emergency_fund_months:.1f} months of expenses saved. Aim for at least 3-6 months.",
                "category": "emergency_fund",
                "impact_area": "Emergency Fund",
                "priority": 5,
                "estimated_score_improvement": 20
            })
            
            # Add specific tactics
            if emergency_fund_months < 1:
                recommendations.append({
                    "title": "Start a €1,000 Emergency Fund",
                    "description": "Before focusing on other financial goals, build a starter emergency fund of €1,000.",
                    "category": "emergency_fund",
                    "impact_area": "Emergency Fund",
                    "priority": 5,
                    "estimated_score_improvement": 10
                })
        
        if spending_stability_score < 40:
            recommendations.append({
                "title": "Stabilize Your Spending Patterns",
                "description": "Your monthly expenses fluctuate significantly, which can make budgeting difficult. Work on more consistent spending habits.",
                "category": "spending_stability",
                "impact_area": "Spending Stability",
                "priority": 2,
                "estimated_score_improvement": 10
            })
        
        # Add general recommendations if we don't have many specific ones
        if len(recommendations) < 3:
            recommendations.append({
                "title": "Review Your Financial Goals",
                "description": "Set specific, measurable, achievable, relevant, and time-bound (SMART) financial goals to improve your financial health.",
                "category": "general",
                "impact_area": "Overall Score",
                "priority": 3,
                "estimated_score_improvement": 5
            })
            
            recommendations.append({
                "title": "Automate Your Finances",
                "description": "Set up automatic transfers to savings and investment accounts to ensure consistent progress toward your goals.",
                "category": "general",
                "impact_area": "Overall Score",
                "priority": 3,
                "estimated_score_improvement": 5
            })
        
        # Limit to top 5 recommendations by priority
        recommendations.sort(key=lambda x: x["priority"], reverse=True)
        return recommendations[:5]
