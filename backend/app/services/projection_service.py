from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_, desc, text
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
import calendar
import numpy as np
import logging
from typing import List, Dict, Optional, Tuple, Any

from ..models.transaction import Transaction, TransactionType, ExpenseCategory, ExpenseType
from ..models.statistics import FinancialStatistics, CategoryStatistics, StatisticsPeriod
from ..models.financial_health import FinancialHealth
from ..models.financial_projection import ProjectionScenario, ProjectionParameter, ProjectionResult, ParamType

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ProjectionService:
    """Service for analyzing financial data and creating future projections"""
    
    # Default parameters for projection scenarios
    DEFAULT_PARAMETERS = {
        "base_case": {
            "income_growth_rate": {"value": 0.03, "type": ParamType.PERCENTAGE},
            "essential_expenses_growth_rate": {"value": 0.03, "type": ParamType.PERCENTAGE},
            "discretionary_expenses_growth_rate": {"value": 0.03, "type": ParamType.PERCENTAGE},
            "investment_rate": {"value": 0.10, "type": ParamType.PERCENTAGE},
            "inflation_rate": {"value": 0.02, "type": ParamType.PERCENTAGE},
            "investment_return_rate": {"value": 0.07, "type": ParamType.PERCENTAGE},
            "emergency_fund_target": {"value": 6.0, "type": ParamType.MONTHS},
            "holdings_market_value": {"value": 0.0, "type": ParamType.AMOUNT},
        },
        "optimistic_case": {
            "income_growth_rate": {"value": 0.05, "type": ParamType.PERCENTAGE},
            "essential_expenses_growth_rate": {"value": 0.02, "type": ParamType.PERCENTAGE},
            "discretionary_expenses_growth_rate": {"value": 0.02, "type": ParamType.PERCENTAGE},
            "investment_rate": {"value": 0.15, "type": ParamType.PERCENTAGE},
            "inflation_rate": {"value": 0.02, "type": ParamType.PERCENTAGE},
            "investment_return_rate": {"value": 0.08, "type": ParamType.PERCENTAGE},
            "emergency_fund_target": {"value": 6.0, "type": ParamType.MONTHS},
            "holdings_market_value": {"value": 0.0, "type": ParamType.AMOUNT},
        },
        "conservative_case": {
            "income_growth_rate": {"value": 0.02, "type": ParamType.PERCENTAGE},
            "essential_expenses_growth_rate": {"value": 0.03, "type": ParamType.PERCENTAGE},
            "discretionary_expenses_growth_rate": {"value": 0.03, "type": ParamType.PERCENTAGE},
            "investment_rate": {"value": 0.10, "type": ParamType.PERCENTAGE},
            "inflation_rate": {"value": 0.03, "type": ParamType.PERCENTAGE},
            "investment_return_rate": {"value": 0.05, "type": ParamType.PERCENTAGE},
            "emergency_fund_target": {"value": 9.0, "type": ParamType.MONTHS},
            "holdings_market_value": {"value": 0.0, "type": ParamType.AMOUNT},
        },
        "expense_reduction": {
            "income_growth_rate": {"value": 0.03, "type": ParamType.PERCENTAGE},
            "essential_expenses_growth_rate": {"value": 0.02, "type": ParamType.PERCENTAGE},
            "discretionary_expenses_growth_rate": {"value": -0.05, "type": ParamType.PERCENTAGE},
            "investment_rate": {"value": 0.12, "type": ParamType.PERCENTAGE},
            "inflation_rate": {"value": 0.02, "type": ParamType.PERCENTAGE},
            "investment_return_rate": {"value": 0.07, "type": ParamType.PERCENTAGE},
            "emergency_fund_target": {"value": 6.0, "type": ParamType.MONTHS},
            "holdings_market_value": {"value": 0.0, "type": ParamType.AMOUNT},
        },
        "investment_focus": {
            "income_growth_rate": {"value": 0.03, "type": ParamType.PERCENTAGE},
            "essential_expenses_growth_rate": {"value": 0.03, "type": ParamType.PERCENTAGE},
            "discretionary_expenses_growth_rate": {"value": 0.01, "type": ParamType.PERCENTAGE},
            "investment_rate": {"value": 0.20, "type": ParamType.PERCENTAGE},
            "inflation_rate": {"value": 0.02, "type": ParamType.PERCENTAGE},
            "investment_return_rate": {"value": 0.07, "type": ParamType.PERCENTAGE},
            "emergency_fund_target": {"value": 6.0, "type": ParamType.MONTHS},
            "holdings_market_value": {"value": 0.0, "type": ParamType.AMOUNT},
        }
    }
    
    @staticmethod
    def create_default_scenarios(db: Session) -> List[ProjectionScenario]:
        """Create the default projection scenarios if they don't exist"""
        scenarios = []
        
        # Check if default scenarios already exist
        existing_defaults = db.query(ProjectionScenario).filter(ProjectionScenario.is_default == True).all()
        if existing_defaults:
            return existing_defaults
            
        # Define default scenarios
        scenario_definitions = {
            "base_case": {
                "name": "Base Case",
                "description": "Projection based on current patterns and average growth rates",
                "parameters": ProjectionService.DEFAULT_PARAMETERS["base_case"]
            },
            "optimistic_case": {
                "name": "Optimistic Case",
                "description": "Projection with higher income growth and investment returns",
                "parameters": ProjectionService.DEFAULT_PARAMETERS["optimistic_case"]
            },
            "conservative_case": {
                "name": "Conservative Case",
                "description": "Projection with lower income growth and investment returns",
                "parameters": ProjectionService.DEFAULT_PARAMETERS["conservative_case"]
            },
            "expense_reduction": {
                "name": "Expense Reduction",
                "description": "Projection focused on reducing discretionary spending",
                "parameters": ProjectionService.DEFAULT_PARAMETERS["expense_reduction"]
            },
            "investment_focus": {
                "name": "Investment Focus",
                "description": "Projection prioritizing increased investments",
                "parameters": ProjectionService.DEFAULT_PARAMETERS["investment_focus"]
            }
        }
        
        try:
            # Create each default scenario
            for key, definition in scenario_definitions.items():
                scenario = ProjectionScenario(
                    name=definition["name"],
                    description=definition["description"],
                    is_default=True,
                    created_at=date.today()
                )
                db.add(scenario)
                db.flush()  # Get the ID
                
                # Add parameters
                for param_name, param_info in definition["parameters"].items():
                    param = ProjectionParameter(
                        scenario_id=scenario.id,
                        param_name=param_name,
                        param_value=param_info["value"],
                        param_type=param_info["type"]
                    )
                    db.add(param)
                
                scenarios.append(scenario)
            
            db.commit()
            return scenarios
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating default scenarios: {str(e)}")
            raise e
    
    @staticmethod
    def analyze_historical_data(db: Session) -> Dict[str, Any]:
        """Analyze historical financial data to extract patterns and trends"""
        try:
            # Get the last 2 years of data
            # Use the date from the last transaction if available otherwise use today
            latest_transaction = db.query(Transaction).order_by(Transaction.transaction_date.desc()).first()
            if latest_transaction:
                two_years_ago = latest_transaction.transaction_date - relativedelta(years=2)
            else:
                two_years_ago = date.today() - relativedelta(years=2)
            
            # Query monthly statistics
            monthly_stats = db.query(FinancialStatistics).filter(
                FinancialStatistics.period == StatisticsPeriod.MONTHLY,
                FinancialStatistics.date >= two_years_ago
            ).order_by(FinancialStatistics.date).all()
            
            if not monthly_stats:
                raise ValueError("Not enough historical data for analysis (need at least 3 months)")
                
            # Extract time series data
            dates = []
            income_series = []
            expense_series = []
            savings_series = []
            
            for stat in monthly_stats:
                dates.append(stat.date)
                income_series.append(stat.period_income)
                expense_series.append(stat.period_expenses)
                savings_series.append(stat.period_net_savings)
            
            # Calculate growth rates
            income_growth_rates = []
            expense_growth_rates = []
            
            for i in range(1, len(income_series)):
                if income_series[i-1] > 0:
                    income_growth = (income_series[i] - income_series[i-1]) / income_series[i-1]
                    income_growth_rates.append(income_growth)
                
                if expense_series[i-1] > 0:
                    expense_growth = (expense_series[i] - expense_series[i-1]) / expense_series[i-1]
                    expense_growth_rates.append(expense_growth)
            
            # Calculate averages
            avg_monthly_income = np.mean(income_series[-12:]) if len(income_series) >= 12 else np.mean(income_series)
            avg_monthly_expenses = np.mean(expense_series[-12:]) if len(expense_series) >= 12 else np.mean(expense_series)
            avg_monthly_savings = np.mean(savings_series[-12:]) if len(savings_series) >= 12 else np.mean(savings_series)
            
            # Calculate average growth rates (annualized)
            avg_annual_income_growth = np.mean(income_growth_rates) * 12 if income_growth_rates else 0.03
            avg_annual_expense_growth = np.mean(expense_growth_rates) * 12 if expense_growth_rates else 0.03
            
            # Get latest investment rate
            latest_health = db.query(FinancialHealth).order_by(FinancialHealth.date.desc()).first()
            current_investment_rate = latest_health.investment_rate if latest_health else 0.10
            
            # Calculate expense breakdown (essential vs discretionary)
            category_stats = db.query(CategoryStatistics).filter(
                CategoryStatistics.period == StatisticsPeriod.MONTHLY,
                CategoryStatistics.date >= two_years_ago,
                CategoryStatistics.transaction_type == TransactionType.EXPENSE
            ).order_by(CategoryStatistics.date).all()
            
            # Group stats by month and expense type
            monthly_stats = {}
            for stat in category_stats:
                month_key = stat.date.strftime('%Y-%m')
                if month_key not in monthly_stats:
                    monthly_stats[month_key] = {'essential': 0, 'discretionary': 0}
                
                if stat.expense_type == ExpenseType.ESSENTIAL:
                    monthly_stats[month_key]['essential'] += stat.period_amount
                else:
                    monthly_stats[month_key]['discretionary'] += stat.period_amount
            
            # Extract monthly totals for each expense type
            monthly_essential = [month_data['essential'] for month_data in monthly_stats.values()]
            monthly_discretionary = [month_data['discretionary'] for month_data in monthly_stats.values()]
            
            avg_essential_ratio = np.mean(monthly_essential) / avg_monthly_expenses if avg_monthly_expenses > 0 else 0.6
            avg_discretionary_ratio = np.mean(monthly_discretionary) / avg_monthly_expenses if avg_monthly_expenses > 0 else 0.4
            # Calculate seasonality (not implemented in this version)
            # This would identify recurring patterns in income/expenses
            
            return {
                "avg_monthly_income": avg_monthly_income,
                "avg_monthly_expenses": avg_monthly_expenses,
                "avg_monthly_savings": avg_monthly_savings,
                "avg_annual_income_growth": avg_annual_income_growth,
                "avg_annual_expense_growth": avg_annual_expense_growth,
                "current_investment_rate": current_investment_rate,
                "essential_expense_ratio": avg_essential_ratio,
                "discretionary_expense_ratio": avg_discretionary_ratio,
                "latest_date": dates[-1] if dates else date.today()
            }
            
        except Exception as e:
            logger.error(f"Error analyzing historical data: {str(e)}")
            raise e
    
    @staticmethod
    def calculate_projection(db: Session, scenario_id: int, time_horizon: int = 60) -> List[ProjectionResult]:
        """
        Calculate financial projections for a scenario
        
        Args:
            db: Database session
            scenario_id: ID of the scenario to calculate
            time_horizon: Number of months to project (default: 60 = 5 years)
            
        Returns:
            List of projection results
        """
        try:
            # Get the scenario and its parameters
            scenario = db.query(ProjectionScenario).filter(ProjectionScenario.id == scenario_id).first()
            if not scenario:
                raise ValueError(f"Scenario with ID {scenario_id} not found")
                
            parameters = db.query(ProjectionParameter).filter(
                ProjectionParameter.scenario_id == scenario_id
            ).all()
            
            # Convert parameters to a dictionary
            param_dict = {}
            for param in parameters:
                param_dict[param.param_name] = param.param_value
            
            # Get historical data analysis
            historical_data = ProjectionService.analyze_historical_data(db)
            
            # Clear existing projection results for this scenario
            db.query(ProjectionResult).filter(ProjectionResult.scenario_id == scenario_id).delete()
            
            # Start with current values
            current_date = historical_data["latest_date"]
            current_income = historical_data["avg_monthly_income"]
            current_essential_expenses = historical_data["avg_monthly_expenses"] * historical_data["essential_expense_ratio"]
            current_discretionary_expenses = historical_data["avg_monthly_expenses"] * historical_data["discretionary_expense_ratio"]
            current_investment_rate = param_dict.get("investment_rate", historical_data["current_investment_rate"])
            
            # Initialize investment portfolio with current market value if provided
            investment_portfolio = param_dict.get("holdings_market_value", 0)
            
            # Get the latest total_net_savings value from FinancialStatistics
            latest_stats = db.query(FinancialStatistics).filter(
                FinancialStatistics.period == StatisticsPeriod.ALL_TIME
            ).first()
            
            # Use the latest total_net_savings as initial net worth, or fall back to 6 months of income if not available
            # Add the current market value of investments to the initial net worth
            savings_base = latest_stats.total_net_savings if latest_stats else current_income * 6
            initial_net_worth = savings_base + investment_portfolio
            
            # Calculate monthly growth rates from annual rates
            monthly_income_growth = (1 + param_dict.get("income_growth_rate", 0.03)) ** (1/12) - 1
            monthly_essential_growth = (1 + param_dict.get("essential_expenses_growth_rate", 0.03)) ** (1/12) - 1
            monthly_discretionary_growth = (1 + param_dict.get("discretionary_expenses_growth_rate", 0.03)) ** (1/12) - 1
            monthly_investment_return = (1 + param_dict.get("investment_return_rate", 0.07)) ** (1/12) - 1
            
            # Generate projection results
            results = []
            net_worth = initial_net_worth
            
            for i in range(time_horizon):
                # Calculate date for this projection point
                projection_date = current_date + relativedelta(months=i+1)
                
                # Apply growth rates
                if i > 0:  # Keep first month at current values
                    current_income *= (1 + monthly_income_growth)
                    current_essential_expenses *= (1 + monthly_essential_growth)
                    current_discretionary_expenses *= (1 + monthly_discretionary_growth)
                
                # Calculate derived values
                total_expenses = current_essential_expenses + current_discretionary_expenses
                investment_amount = current_income * current_investment_rate
                savings = current_income - total_expenses - investment_amount
                
                # Update investment portfolio with returns and new investments
                investment_portfolio = (investment_portfolio * (1 + monthly_investment_return)) + investment_amount
                
                # Update net worth
                net_worth += savings + investment_amount  # Investment is already counted in portfolio
                
                # Create projection result
                result = ProjectionResult(
                    scenario_id=scenario_id,
                    month=projection_date.month,
                    year=projection_date.year,
                    projected_income=current_income,
                    projected_expenses=total_expenses,
                    projected_investments=investment_amount,
                    projected_savings=savings,
                    projected_net_worth=net_worth,
                    created_at=date.today()
                )
                
                db.add(result)
                results.append(result)
            
            db.commit()
            return results
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error calculating projection: {str(e)}")
            raise e
    
    @staticmethod
    def get_projection_results(db: Session, scenario_id: int) -> Dict[str, Any]:
        """Get projection results in a format suitable for visualization"""
        try:
            results = db.query(ProjectionResult).filter(
                ProjectionResult.scenario_id == scenario_id
            ).order_by(ProjectionResult.year, ProjectionResult.month).all()
            
            if not results:
                raise ValueError(f"No projection results found for scenario {scenario_id}")
            
            # Format results for visualization
            dates = []
            income_series = []
            expense_series = []
            investment_series = []
            savings_series = []
            net_worth_series = []
            
            for result in results:
                date_str = f"{result.year}-{result.month:02d}"
                dates.append(date_str)
                income_series.append(round(result.projected_income, 2))
                expense_series.append(round(result.projected_expenses, 2))
                investment_series.append(round(result.projected_investments, 2))
                savings_series.append(round(result.projected_savings, 2))
                net_worth_series.append(round(result.projected_net_worth, 2))
            
            return {
                "dates": dates,
                "projected_income": income_series,
                "projected_expenses": expense_series,
                "projected_investments": investment_series,
                "projected_savings": savings_series,
                "projected_net_worth": net_worth_series
            }
            
        except Exception as e:
            logger.error(f"Error retrieving projection results: {str(e)}")
            raise e
    
    @staticmethod
    def compare_scenarios(db: Session, scenario_ids: List[int]) -> Dict[str, Any]:
        """Compare multiple scenarios side by side"""
        try:
            comparison = {
                "scenario_names": [],
                "dates": [],
                "net_worth_series": {},
                "savings_series": {},
                "investment_series": {}
            }
            
            # Get the first scenario's dates to use as reference
            if not scenario_ids:
                raise ValueError("No scenarios provided for comparison")
                
            first_results = db.query(ProjectionResult).filter(
                ProjectionResult.scenario_id == scenario_ids[0]
            ).order_by(ProjectionResult.year, ProjectionResult.month).all()
            
            if not first_results:
                raise ValueError(f"No projection results found for scenario {scenario_ids[0]}")
                
            # Set up dates
            for result in first_results:
                date_str = f"{result.year}-{result.month:02d}"
                comparison["dates"].append(date_str)
            
            # Get data for each scenario
            for scenario_id in scenario_ids:
                scenario = db.query(ProjectionScenario).filter(ProjectionScenario.id == scenario_id).first()
                if not scenario:
                    continue
                    
                comparison["scenario_names"].append(scenario.name)
                
                results = db.query(ProjectionResult).filter(
                    ProjectionResult.scenario_id == scenario_id
                ).order_by(ProjectionResult.year, ProjectionResult.month).all()
                
                if not results:
                    continue
                    
                # Extract series
                net_worth_series = [round(r.projected_net_worth, 2) for r in results]
                savings_series = [round(r.projected_savings, 2) for r in results]
                investment_series = [round(r.projected_investments, 2) for r in results]
                
                comparison["net_worth_series"][scenario.name] = net_worth_series
                comparison["savings_series"][scenario.name] = savings_series
                comparison["investment_series"][scenario.name] = investment_series
            
            return comparison
            
        except Exception as e:
            logger.error(f"Error comparing scenarios: {str(e)}")
            raise e
