from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date
from typing import List, Optional
import logging
import pandas as pd

from ..models.budget import Budget
from ..models.transaction import Transaction, TransactionType, ExpenseCategory

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Status thresholds (fraction of the limit)
WARNING_THRESHOLD = 0.8
OVER_THRESHOLD = 1.0

# Suggestion defaults
DEFAULT_SUGGESTION_PERCENTILE = 75.0
DEFAULT_LOOKBACK_MONTHS = 6


class DuplicateBudgetError(ValueError):
    """Raised when an active budget already exists for a category."""
    pass


class InvalidCategoryError(ValueError):
    """Raised when a category is not a valid ExpenseCategory value."""
    pass


class BudgetService:
    WARNING_THRESHOLD = WARNING_THRESHOLD
    OVER_THRESHOLD = OVER_THRESHOLD
    DEFAULT_SUGGESTION_PERCENTILE = DEFAULT_SUGGESTION_PERCENTILE
    DEFAULT_LOOKBACK_MONTHS = DEFAULT_LOOKBACK_MONTHS

    @staticmethod
    def _valid_categories() -> set:
        return {c.value for c in ExpenseCategory}

    @staticmethod
    def get_budgets(db: Session) -> List[Budget]:
        """Return active budgets ordered by category."""
        return (
            db.query(Budget)
            .filter(Budget.is_active == True)  # noqa: E712
            .order_by(Budget.category)
            .all()
        )

    @staticmethod
    def get_budget(db: Session, budget_id: int) -> Optional[Budget]:
        return db.query(Budget).filter(Budget.id == budget_id).first()

    @staticmethod
    def get_budget_by_category(db: Session, category: str) -> Optional[Budget]:
        return (
            db.query(Budget)
            .filter(Budget.category == category, Budget.is_active == True)  # noqa: E712
            .first()
        )

    @staticmethod
    def create_budget(db: Session, data) -> Budget:
        """Create a budget. Raises InvalidCategoryError / DuplicateBudgetError."""
        if data.category not in BudgetService._valid_categories():
            raise InvalidCategoryError(f"Invalid category: {data.category}")

        existing = BudgetService.get_budget_by_category(db, data.category)
        if existing:
            raise DuplicateBudgetError(
                f"An active budget already exists for category: {data.category}"
            )

        budget = Budget(
            category=data.category,
            limit_amount=data.limit_amount,
            period=data.period or "monthly",
            is_active=True,
        )
        db.add(budget)
        db.commit()
        db.refresh(budget)
        return budget

    @staticmethod
    def update_budget(db: Session, budget_id: int, data) -> Optional[Budget]:
        """Partial update of limit_amount / is_active. Returns None if not found."""
        budget = BudgetService.get_budget(db, budget_id)
        if not budget:
            return None

        if data.limit_amount is not None:
            budget.limit_amount = data.limit_amount
        if data.is_active is not None:
            budget.is_active = data.is_active

        db.commit()
        db.refresh(budget)
        return budget

    @staticmethod
    def delete_budget(db: Session, budget_id: int) -> bool:
        budget = BudgetService.get_budget(db, budget_id)
        if not budget:
            return False
        db.delete(budget)
        db.commit()
        return True

    @staticmethod
    def _resolve_target_month(db: Session, target_date: Optional[date]) -> date:
        """Resolve the target month. Defaults to the latest transaction's month."""
        if target_date is not None:
            return target_date
        latest_transaction = (
            db.query(Transaction)
            .order_by(Transaction.transaction_date.desc())
            .first()
        )
        return latest_transaction.transaction_date if latest_transaction else date.today()

    @staticmethod
    def _month_spend(db: Session, category: str, year: int, month: int) -> float:
        """Sum of abs(amount) of EXPENSE transactions for a category in a given month."""
        total = (
            db.query(func.sum(func.abs(Transaction.amount)))
            .filter(
                Transaction.transaction_type == TransactionType.EXPENSE,
                Transaction.expense_category == ExpenseCategory(category),
                extract('year', Transaction.transaction_date) == year,
                extract('month', Transaction.transaction_date) == month,
            )
            .scalar()
        )
        return float(total or 0.0)

    @staticmethod
    def _compute_status(percentage: float) -> str:
        if percentage >= OVER_THRESHOLD * 100:
            return "over"
        if percentage >= WARNING_THRESHOLD * 100:
            return "warning"
        return "on_track"

    @staticmethod
    def get_progress(db: Session, target_date: Optional[date] = None) -> List[dict]:
        """Compute progress for each active budget in the target month."""
        target_month = BudgetService._resolve_target_month(db, target_date)
        month_str = target_month.strftime("%Y-%m")

        results = []
        for budget in BudgetService.get_budgets(db):
            spent = BudgetService._month_spend(
                db, budget.category, target_month.year, target_month.month
            )
            limit_amount = budget.limit_amount

            if limit_amount > 0:
                remaining = limit_amount - spent
                percentage = round(spent / limit_amount * 100, 1)
            else:
                # Defensive divide-by-zero guard (schema should prevent this).
                percentage = 100.0 if spent > 0 else 0.0
                remaining = -spent

            results.append({
                "category": budget.category,
                "limit_amount": limit_amount,
                "spent": round(spent, 2),
                "remaining": round(remaining, 2),
                "percentage": percentage,
                "status": BudgetService._compute_status(percentage),
                "month": month_str,
            })
        return results

    @staticmethod
    def _trailing_months(target_month: date, months: int) -> List[tuple]:
        """Return a list of (year, month) tuples for the trailing N months ending at target."""
        result = []
        year, month = target_month.year, target_month.month
        for _ in range(months):
            result.append((year, month))
            month -= 1
            if month == 0:
                month = 12
                year -= 1
        result.reverse()
        return result

    @staticmethod
    def suggest_limit(
        db: Session,
        category: str,
        percentile: float = DEFAULT_SUGGESTION_PERCENTILE,
        months: int = DEFAULT_LOOKBACK_MONTHS,
        target_date: Optional[date] = None,
    ) -> dict:
        """Suggest a monthly limit from the percentile of trailing monthly spend."""
        if category not in BudgetService._valid_categories():
            raise InvalidCategoryError(f"Invalid category: {category}")

        target_month = BudgetService._resolve_target_month(db, target_date)
        window = BudgetService._trailing_months(target_month, months)

        monthly_history = [
            round(BudgetService._month_spend(db, category, y, m), 2)
            for (y, m) in window
        ]

        # No-history case: no spend at all in the window.
        if not any(v > 0 for v in monthly_history):
            return {
                "category": category,
                "suggested_limit": 0.0,
                "percentile": percentile,
                "months_analyzed": 0,
                "monthly_history": [],
            }

        suggested_limit = round(
            float(pd.Series(monthly_history).quantile(percentile / 100.0)), 2
        )

        return {
            "category": category,
            "suggested_limit": suggested_limit,
            "percentile": percentile,
            "months_analyzed": len(monthly_history),
            "monthly_history": monthly_history,
        }
