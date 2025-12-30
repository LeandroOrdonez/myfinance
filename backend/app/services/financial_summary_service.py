from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, date
import calendar
from dateutil.relativedelta import relativedelta
from typing import Dict, Any, List, Optional
import logging

from ..models.transaction import Transaction, TransactionType, ExpenseCategory, IncomeCategory
from ..models.statistics import FinancialStatistics, CategoryStatistics, StatisticsPeriod
from ..models.financial_health import FinancialHealth, FinancialRecommendation
from ..models.anomaly import TransactionAnomaly, AnomalyStatus
from ..models.financial_projection import ProjectionScenario, ProjectionParameter, ProjectionResult
from ..services.statistics_service import StatisticsService
from ..services.financial_health_service import FinancialHealthService
from ..services.projection_service import ProjectionService
from ..services.anomaly_detection_service import AnomalyDetectionService
from ..schemas.financial_summary import (
    FinancialSummaryResponse, AccountOverview, DataPeriod,
    TransactionSummary, TransactionVolume, IncomeAnalysis, IncomeTrend,
    ExpenseAnalysis, ExpenseTrend, FinancialHealthSummary, MetricScore,
    SavingsInvestmentSummary, ProjectionsSummary, ProjectionHighlight
)

logger = logging.getLogger(__name__)

class FinancialSummaryService:
    @staticmethod
    def generate_summary(db: Session) -> FinancialSummaryResponse:
        """
        Generates a comprehensive, LLM-friendly financial summary by aggregating data
        from various services.
        """
        try:
            # 1. Basic Data Info
            last_transaction = db.query(Transaction).order_by(Transaction.transaction_date.desc()).first()
            
            if not last_transaction:
                raise ValueError("No transaction data found")
                
            # Set end_date to the last day of the month of the last transaction
            last_date = last_transaction.transaction_date
            end_date = last_date.replace(day=calendar.monthrange(last_date.year, last_date.month)[1])
            
            # Start date is the beginning of the 12-month period ending at end_date
            start_date = end_date.replace(year=end_date.year - 1)
            
            # 2. Account Overview
            all_time_stats = db.query(FinancialStatistics).filter(
                FinancialStatistics.period == StatisticsPeriod.ALL_TIME
            ).first()
            
            net_worth = all_time_stats.total_net_savings if all_time_stats else 0
            
            account_overview = AccountOverview(
                total_balance=net_worth, # In this app, balance is net savings
                net_worth=net_worth,
                data_period=DataPeriod(start_date=start_date, end_date=end_date),
                last_transaction_date=end_date
            )
            
            # 3. Transaction Summary
            total_count = db.query(Transaction).count()
            
            # Monthly volume for last 12 months
            twelve_months_ago = start_date
            
            monthly_stats = db.query(FinancialStatistics).filter(
                FinancialStatistics.period == StatisticsPeriod.MONTHLY,
                FinancialStatistics.date >= twelve_months_ago
            ).order_by(FinancialStatistics.date.asc()).all()
            
            monthly_volume = [
                TransactionVolume(
                    month=stat.date.strftime("%Y-%m"),
                    amount=stat.period_expenses,
                    count=stat.expense_count + stat.income_count
                ) for stat in monthly_stats
            ]
            
            avg_trans_amount = db.query(func.avg(func.abs(Transaction.amount))).filter(
                Transaction.transaction_date >= twelve_months_ago
            ).scalar() or 0
            
            # Top categories (last 12 months)
            top_cats_data = db.query(
                CategoryStatistics.category_name,
                func.sum(CategoryStatistics.period_amount).label('total_amount')
            ).filter(
                CategoryStatistics.period == StatisticsPeriod.MONTHLY,
                CategoryStatistics.transaction_type == TransactionType.EXPENSE,
                CategoryStatistics.date >= twelve_months_ago
            ).group_by(CategoryStatistics.category_name).order_by(desc('total_amount')).limit(5).all()
            
            top_categories = [{"category": row[0], "amount": row[1]} for row in top_cats_data]
            
            # Recent large transactions (last 12 months)
            recent_income = db.query(Transaction).filter(
                Transaction.transaction_type == TransactionType.INCOME,
                Transaction.transaction_date >= twelve_months_ago
            ).order_by(desc(Transaction.amount)).limit(5).all()
            
            recent_expenses = db.query(Transaction).filter(
                Transaction.transaction_type == TransactionType.EXPENSE,
                Transaction.transaction_date >= twelve_months_ago
            ).order_by(Transaction.amount).limit(5).all() # Most negative first
            
            # 4. Income Analysis
            income_trends = [
                IncomeTrend(month=stat.date.strftime("%Y-%m"), amount=stat.period_income)
                for stat in monthly_stats
            ]
            
            primary_sources_data = db.query(
                CategoryStatistics.category_name,
                func.sum(CategoryStatistics.period_amount).label('total_amount')
            ).filter(
                CategoryStatistics.period == StatisticsPeriod.MONTHLY,
                CategoryStatistics.transaction_type == TransactionType.INCOME,
                CategoryStatistics.date >= twelve_months_ago
            ).group_by(CategoryStatistics.category_name).order_by(desc('total_amount')).all()
            
            primary_sources = [{"source": row[0], "amount": row[1]} for row in primary_sources_data]
            
            historical_data = ProjectionService.analyze_historical_data(db)
            
            # 5. Expense Analysis
            expense_trends = [
                ExpenseTrend(month=stat.date.strftime("%Y-%m"), amount=stat.period_expenses)
                for stat in monthly_stats
            ]
            
            essential_ratio = historical_data.get("essential_expense_ratio", 0.6)
            discretionary_ratio = historical_data.get("discretionary_expense_ratio", 0.4)
            
            anomalies = db.query(TransactionAnomaly).filter(
                TransactionAnomaly.status == AnomalyStatus.DETECTED,
            ).order_by(desc(TransactionAnomaly.anomaly_score)).limit(5).all()
            
            # 6. Financial Health Metrics
            health = FinancialHealthService.calculate_health_score(db, end_date)
            
            def get_status(score):
                if score >= 80: return "excellent"
                if score >= 60: return "good"
                if score >= 40: return "average"
                if score >= 20: return "poor"
                return "critical"

            health_summary = FinancialHealthSummary(
                overall_score=health.overall_score,
                metrics={
                    "savings_rate": MetricScore(score=health.savings_rate_score, value=health.savings_rate, status=get_status(health.savings_rate_score)),
                    "expense_ratio": MetricScore(score=health.expense_ratio_score, value=health.expense_ratio, status=get_status(health.expense_ratio_score)),
                    "budget_adherence": MetricScore(score=health.budget_adherence_score, value=health.budget_adherence, status=get_status(health.budget_adherence_score)),
                    "debt_to_income": MetricScore(score=health.debt_to_income_score, value=health.debt_to_income, status=get_status(health.debt_to_income_score)),
                    "emergency_fund": MetricScore(score=health.emergency_fund_score, value=health.emergency_fund_months, status=get_status(health.emergency_fund_score)),
                    "spending_stability": MetricScore(score=health.spending_stability_score, value=health.spending_stability, status=get_status(health.spending_stability_score)),
                    "investment_rate": MetricScore(score=health.investment_rate_score, value=health.investment_rate, status=get_status(health.investment_rate_score)),
                },
                top_recommendations=[{
                    "title": r["title"],
                    "description": r["description"],
                    "priority": r["priority"]
                } for r in health.recommendations[:3]] if health.recommendations else []
            )
            
            # 7. Projections (Moved up to get params for savings/investment)
            base_scenario = db.query(ProjectionScenario).filter(
                ProjectionScenario.is_base_scenario == True
            ).first()
            
            if not base_scenario:
                # Create default scenarios if none exist
                ProjectionService.create_default_scenarios(db)
                base_scenario = db.query(ProjectionScenario).filter(
                    ProjectionScenario.is_base_scenario == True
                ).first()
            
            # Check for existing results first
            has_results = db.query(ProjectionResult).filter(
                ProjectionResult.scenario_id == base_scenario.id
            ).first() is not None
            
            if not has_results:
                ProjectionService.calculate_projection(db, base_scenario.id, time_horizon=12)
            
            # Retrieve results using get_projection_results
            projection_data = ProjectionService.get_projection_results(db, base_scenario.id)
            
            # Extract highlights (indices 5 for 6-month, 11 for 12-month)
            # Ensure we don't go out of bounds if less data is available
            idx_6m = min(5, len(projection_data["projected_net_worth"]) - 1)
            idx_12m = min(11, len(projection_data["projected_net_worth"]) - 1)
            
            six_month_net_worth = projection_data["projected_net_worth"][idx_6m]
            six_month_savings = projection_data["projected_savings"][idx_6m]
            
            one_year_net_worth = projection_data["projected_net_worth"][idx_12m]
            one_year_savings = projection_data["projected_savings"][idx_12m]
            
            params = db.query(ProjectionParameter).filter(
                ProjectionParameter.scenario_id == base_scenario.id
            ).all()

            # 8. Savings & Investment
            # Get investment portfolio value from projection parameters if available
            investment_portfolio_value = 0
            if params:
                for p in params:
                    if p.param_name == "holdings_market_value":
                        investment_portfolio_value = p.param_value
                        break
            
            # Update net worth to include investments
            net_worth = (all_time_stats.total_net_savings if all_time_stats else 0) + investment_portfolio_value
            account_overview.net_worth = net_worth
            account_overview.total_balance = net_worth

            # Savings growth trend (last 12 months)
            savings_growth_trend = [
                {
                    "month": stat.date.strftime("%Y-%m"),
                    "net_savings": stat.period_net_savings,
                    "cumulative_savings": stat.total_net_savings
                } for stat in monthly_stats
            ]

            # Get investment allocation (last 12 months)
            invest_alloc_data = db.query(
                CategoryStatistics.category_name,
                func.sum(CategoryStatistics.period_amount).label('total_amount')
            ).filter(
                CategoryStatistics.period == StatisticsPeriod.MONTHLY,
                CategoryStatistics.category_name.in_([ExpenseCategory.INVESTMENTS.value, ExpenseCategory.SAVINGS.value]),
                CategoryStatistics.date >= twelve_months_ago
            ).group_by(CategoryStatistics.category_name).all()
            
            # Narrative Summary
            narrative = FinancialSummaryService._generate_narrative(health, historical_data)
            
            return FinancialSummaryResponse(
                generated_at=datetime.now(),
                data_period=DataPeriod(start_date=start_date, end_date=end_date),
                account_overview=account_overview,
                transaction_summary=TransactionSummary(
                    total_count=total_count,
                    monthly_volume=monthly_volume,
                    average_transaction_amount=avg_trans_amount,
                    top_categories=top_categories,
                    recent_large_income=[{"description": t.description, "amount": t.amount, "date": t.transaction_date} for t in recent_income],
                    recent_large_expenses=[{"description": t.description, "amount": t.amount, "date": t.transaction_date} for t in recent_expenses]
                ),
                income_analysis=IncomeAnalysis(
                    monthly_trends=income_trends,
                    primary_sources=primary_sources,
                    income_stability=health.spending_stability, # Reusing stability as proxy for now
                    yoy_growth=historical_data.get("avg_annual_income_growth")
                ),
                expense_analysis=ExpenseAnalysis(
                    monthly_trends=expense_trends,
                    top_categories=top_categories,
                    essential_vs_discretionary={
                        "essential": essential_ratio,
                        "discretionary": discretionary_ratio
                    },
                    outliers=[{
                        "description": (db.query(Transaction).filter(Transaction.id == a.transaction_id).first()).description if db.query(Transaction).filter(Transaction.id == a.transaction_id).first() else "Unknown",
                        "amount": (db.query(Transaction).filter(Transaction.id == a.transaction_id).first()).amount if db.query(Transaction).filter(Transaction.id == a.transaction_id).first() else 0,
                        "reason": a.reason
                    } for a in anomalies],
                    average_monthly_expenses=historical_data.get("avg_monthly_expenses", 0)
                ),
                financial_health=health_summary,
                savings_investment=SavingsInvestmentSummary(
                    monthly_savings_rate=health.savings_rate,
                    investment_portfolio_value=investment_portfolio_value,
                    savings_growth_trend=savings_growth_trend,
                    investment_allocation=[{"category": row[0], "amount": row[1]} for row in invest_alloc_data]
                ),
                projections_summary=ProjectionsSummary(
                    six_month_outlook=ProjectionHighlight(
                        horizon_months=6,
                        projected_net_worth=six_month_net_worth,
                        projected_savings=six_month_savings
                    ),
                    one_year_outlook=ProjectionHighlight(
                        horizon_months=12,
                        projected_net_worth=one_year_net_worth,
                        projected_savings=one_year_savings
                    ),
                    key_assumptions={p.param_name: p.param_value for p in params}
                ),
                narrative_summary=narrative
            )
        except Exception as e:
            logger.error(f"Error generating financial summary: {str(e)}")
            raise e

    @staticmethod
    def _generate_narrative(health: FinancialHealth, historical: Dict[str, Any]) -> str:
        score = health.overall_score
        if score >= 80:
            status = "excellent"
            overview = "Your financial health is in great shape."
        elif score >= 60:
            status = "good"
            overview = "You have a solid financial foundation with room for optimization."
        elif score >= 40:
            status = "average"
            overview = "Your financial health is stable, but there are clear areas for improvement."
        else:
            status = "concerning"
            overview = "Your financial health requires immediate attention to several key metrics."
            
        savings_text = f"Your current savings rate is {health.savings_rate*100:.1f}%."
        if health.savings_rate < 0.1:
            savings_text += " This is below the recommended 10-20% range."
            
        emergency_fund = f"You have approximately {health.emergency_fund_months:.1f} months of expenses saved."
        
        narrative = f"{overview} {savings_text} {emergency_fund} "
        
        if health.recommendations:
            narrative += f"The top priority should be: {health.recommendations[0]['title']}."
            
        return narrative
