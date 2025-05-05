from sqlalchemy.orm import Session
from datetime import date
from ..models.financial_health import FinancialHealthScore, Recommendation, HealthGoal
from ..models.statistics import StatisticsPeriod
from .statistics_service import StatisticsService
from sqlalchemy import func, extract, and_
import math
from ..models.transaction import Transaction, TransactionType, ExpenseCategory

class FinancialHealthService:
    @staticmethod
    def compute_health_score(db: Session, period: StatisticsPeriod, target_date: date = None):
        # Calculate base statistics
        stats = StatisticsService.calculate_statistics(db, period, target_date)
        # Extract metrics
        savings_rate = stats.get('savings_rate', 0)
        expense_ratio = (stats.get('period_expenses', 0) / stats.get('period_income', 1) * 100) if stats.get('period_income', 0) > 0 else 0

        # Budget adherence: no user budgets defined, assume perfect adherence
        budget_adherence = 100

        # Debt-to-Income ratio
        debt_q = db.query(func.sum(func.abs(Transaction.amount))).filter(
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.expense_category == ExpenseCategory.DEBT,
        )
        if period == StatisticsPeriod.MONTHLY and target_date:
            debt_q = debt_q.filter(
                extract('year', Transaction.transaction_date) == target_date.year,
                extract('month', Transaction.transaction_date) == target_date.month
            )
        elif period == StatisticsPeriod.YEARLY and target_date:
            debt_q = debt_q.filter(
                extract('year', Transaction.transaction_date) == target_date.year
            )
        debt_total = debt_q.scalar() or 0
        dti_ratio = (debt_total / stats.get('period_income', 1) * 100) if stats.get('period_income', 0) > 0 else 0

        # Emergency fund ratio: savings relative to monthly expenses
        total_savings = stats.get('total_income', 0) - stats.get('total_expenses', 0)
        if period == StatisticsPeriod.MONTHLY:
            monthly_expenses = stats.get('period_expenses', 0)
        elif period == StatisticsPeriod.YEARLY:
            monthly_expenses = stats.get('yearly_expenses', 0) / 12
        else:
            monthly_expenses = stats.get('period_expenses', 0)
        emergency_fund_ratio = min((total_savings / monthly_expenses * 100), 100) if monthly_expenses > 0 else 0

        # Spending stability: consistency of daily expenses
        trans_q = db.query(Transaction.transaction_date, Transaction.amount).filter(
            Transaction.transaction_type == TransactionType.EXPENSE
        )
        if period == StatisticsPeriod.MONTHLY and target_date:
            trans_q = trans_q.filter(
                extract('year', Transaction.transaction_date) == target_date.year,
                extract('month', Transaction.transaction_date) == target_date.month
            )
        elif period == StatisticsPeriod.YEARLY and target_date:
            trans_q = trans_q.filter(
                extract('year', Transaction.transaction_date) == target_date.year
            )
        rows = trans_q.all()
        daily = {}
        for dt, amt in rows:
            daily.setdefault(dt, 0)
            daily[dt] += abs(amt)
        if daily:
            values = list(daily.values())
            avg = sum(values) / len(values)
            var = sum((x - avg) ** 2 for x in values) / len(values)
            sd = math.sqrt(var)
            cov = (sd / avg * 100) if avg > 0 else 100
            spending_stability = max(0, 100 - cov)
        else:
            spending_stability = 100

        # Compute overall score as average of component scores (inverted where lower is better)
        components = [
            savings_rate,
            max(0, 100 - expense_ratio),
            budget_adherence,
            max(0, 100 - dti_ratio),
            emergency_fund_ratio,
            spending_stability
        ]
        overall = sum(components) / len(components)
        # Upsert health score record
        fh = db.query(FinancialHealthScore).filter(
            and_(
                FinancialHealthScore.period == period,
                FinancialHealthScore.date == target_date
            )
        ).first()
        if fh:
            # update existing
            fh.overall_score = overall
            fh.savings_rate = savings_rate
            fh.expense_ratio = expense_ratio
            fh.budget_adherence = budget_adherence
            fh.dti_ratio = dti_ratio
            fh.emergency_fund_ratio = emergency_fund_ratio
            fh.spending_stability = spending_stability
        else:
            fh = FinancialHealthScore(
                period=period,
                date=target_date,
                overall_score=overall,
                savings_rate=savings_rate,
                expense_ratio=expense_ratio,
                budget_adherence=budget_adherence,
                dti_ratio=dti_ratio,
                emergency_fund_ratio=emergency_fund_ratio,
                spending_stability=spending_stability
            )
            db.add(fh)
        db.commit()
        db.refresh(fh)
        return fh

    @staticmethod
    def get_history(db: Session, period: StatisticsPeriod, start_date=None, end_date=None):
        query = db.query(FinancialHealthScore).filter(FinancialHealthScore.period == period)
        if start_date:
            query = query.filter(FinancialHealthScore.date >= start_date)
        if end_date:
            query = query.filter(FinancialHealthScore.date <= end_date)
        return query.order_by(FinancialHealthScore.date).all()

    @staticmethod
    def list_recommendations(db: Session):
        return db.query(Recommendation).all()

    @staticmethod
    def update_recommendation_progress(db: Session, rec_id: int, progress: float):
        rec = db.query(Recommendation).get(rec_id)
        if not rec:
            return None
        rec.progress = progress
        rec.status = 'completed' if progress >= 100 else rec.status
        db.commit()
        db.refresh(rec)
        return rec

    @staticmethod
    def list_goals(db: Session):
        return db.query(HealthGoal).all()

    @staticmethod
    def create_goal(db: Session, metric: str, target_value: float):
        goal = HealthGoal(metric=metric, target_value=target_value)
        db.add(goal)
        db.commit()
        db.refresh(goal)
        return goal

    @staticmethod
    def delete_goal(db: Session, goal_id: int):
        goal = db.query(HealthGoal).get(goal_id)
        if goal:
            db.delete(goal)
            db.commit()
        return goal
