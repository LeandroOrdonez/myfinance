from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_, desc, text
from datetime import date, datetime, timedelta, timezone
from dateutil.relativedelta import relativedelta
import copy
import calendar
import numpy as np
import logging
import time
import math
from typing import List, Dict, Optional, Tuple, Any

from ..models.transaction import Transaction, TransactionType, ExpenseCategory, ExpenseType
from ..models.statistics import FinancialStatistics, CategoryStatistics, StatisticsPeriod
from ..models.financial_health import FinancialHealth
from ..models.financial_projection import ProjectionScenario, ProjectionParameter, ProjectionResult, ProjectionCalculation, ParamType
from .projection_provenance import MODEL_VERSION, get_provenance, source_version
from ..schemas.financial_projection import PARAMETER_BOUNDS
from .holdings_history_service import HoldingsHistoryService

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ProjectionService:
    """Service for analyzing financial data and creating future projections"""
    
    # Cache for historical data analysis (avoids redundant DB queries)
    _historical_data_cache: Dict[str, Any] = {}
    _cache_timestamp: float = 0
    _cache_ttl_seconds: int = 300  # 5 minutes TTL
    
    # Number of months of actual net worth returned alongside projection results
    ACTUAL_HISTORY_MONTHS = 12
    
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
    def _clamp_to_bounds(param_name: str, value: float) -> float:
        """Clamp a parameter value to its defined bounds.
        
        This is used for calculated values from historical data which may exceed
        the validation bounds due to unusual real-world patterns.
        """
        if param_name in PARAMETER_BOUNDS:
            bounds = PARAMETER_BOUNDS[param_name]
            original = value
            value = max(bounds["min"], min(bounds["max"], value))
            if value != original:
                logger.info(f"Clamped {param_name} from {original:.4f} to {value:.4f} (bounds: {bounds['min']} to {bounds['max']})")
        return value

    @staticmethod
    def _derive_growth_parameters(historical_data: Dict[str, Any]) -> Dict[str, float]:
        """Derive sustainable growth assumptions from historical data.

        Values are clamped to PARAMETER_BOUNDS. Expense growth rates are
        additionally capped at the income growth trend: a short-term spending
        trend cannot sustainably outpace income, so deriving a permanent
        compound rate above it would produce unrealistic forecasts.
        """
        income_growth = ProjectionService._clamp_to_bounds(
            "income_growth_rate",
            historical_data.get("avg_annual_income_growth", 0.03)
        )
        essential_growth = min(
            ProjectionService._clamp_to_bounds(
                "essential_expenses_growth_rate",
                historical_data.get("avg_annual_essential_expense_growth", 0.03)
            ),
            income_growth
        )
        discretionary_growth = min(
            ProjectionService._clamp_to_bounds(
                "discretionary_expenses_growth_rate",
                historical_data.get("avg_annual_discretionary_expense_growth", 0.03)
            ),
            income_growth
        )
        investment_rate = ProjectionService._clamp_to_bounds(
            "investment_rate",
            historical_data.get("avg_investment_rate", 0.10)
        )
        return {
            "income_growth_rate": income_growth,
            "essential_expenses_growth_rate": essential_growth,
            "discretionary_expenses_growth_rate": discretionary_growth,
            "investment_rate": investment_rate,
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
        historical_data = ProjectionService.analyze_historical_data(db)

        # Start with a deep copy of the default base_case parameters
        base_case_params = copy.deepcopy(ProjectionService.DEFAULT_PARAMETERS["base_case"])

        # Update growth parameters using historical data
        derived = ProjectionService._derive_growth_parameters(historical_data)
        for param_name, value in derived.items():
            base_case_params[param_name]["value"] = value

        scenario_definitions = {
            "base_case": {
                "name": "Base Case",
                "description": "Projection based on current patterns and average growth rates",
                "parameters": base_case_params 
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
                # Set is_base_scenario to True only for the Base Case
                is_base = (key == "base_case")
                
                scenario = ProjectionScenario(
                    name=definition["name"],
                    description=definition["description"],
                    is_default=True,
                    is_base_scenario=is_base,
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
    def calculate_annual_growth(monthly_amounts: List[float]) -> Optional[float]:
        """
        Calculate annualized growth by comparing median monthly amounts between two consecutive years.

        Args:
            monthly_amounts: A list of monthly values in chronological order (at least 24 entries for 2 years)

        Returns:
            The annual growth rate as a decimal, or None if calculation is not possible

        Methodology:
            1. Median of first 12 months (year 1 typical month)
            2. Median of next 12 months (year 2 typical month)
            3. Calculate (year2_median / year1_median) - 1

        The median is used instead of year totals so that lumpy one-off months
        (e.g., a single large purchase) do not turn into a permanent compound
        growth rate for the projection.
        """
        # Validate input length
        if len(monthly_amounts) < 24:
            return None

        year1_median = float(np.median(monthly_amounts[:12]))
        year2_median = float(np.median(monthly_amounts[12:24]))

        # Handle zero beginning value
        if year1_median == 0:
            return None

        # Calculate annual growth rate
        annual_growth = (year2_median / year1_median) - 1

        return annual_growth
    
    
    @staticmethod
    def invalidate_historical_data_cache() -> None:
        """Invalidate the historical data cache, forcing a fresh analysis on next call"""
        ProjectionService._historical_data_cache = {}
        ProjectionService._cache_timestamp = 0
        logger.info("Historical data cache invalidated")
    
    @staticmethod
    def analyze_historical_data(db: Session, force_refresh: bool = False) -> Dict[str, Any]:
        """Analyze historical financial data to extract patterns and trends
        
        Args:
            db: Database session
            force_refresh: If True, bypass cache and fetch fresh data
            
        Returns:
            Dictionary containing historical analysis metrics
        """
        # Check cache validity
        current_time = time.time()
        cache_age = current_time - ProjectionService._cache_timestamp
        
        if (not force_refresh 
            and ProjectionService._historical_data_cache 
            and cache_age < ProjectionService._cache_ttl_seconds):
            logger.debug(f"Using cached historical data (age: {cache_age:.1f}s)")
            return ProjectionService._historical_data_cache
        
        try:
            # Get the last 2 years of data
            # Use the date from the last transaction if available otherwise use today
            latest_transaction = db.query(Transaction).order_by(Transaction.transaction_date.desc()).first()
            if latest_transaction:
                two_years_ago = latest_transaction.transaction_date - relativedelta(years=2)
            else:
                two_years_ago = date.today() - relativedelta(years=2)

            two_years_ago = two_years_ago.replace(day=calendar.monthrange(two_years_ago.year, two_years_ago.month)[1])
            
            # Query monthly statistics
            monthly_stats = db.query(FinancialStatistics).filter(
                FinancialStatistics.period == StatisticsPeriod.MONTHLY,
                FinancialStatistics.date > two_years_ago
            ).order_by(FinancialStatistics.date).all()
            
            if not monthly_stats:
                raise ValueError("Not enough historical data for analysis (need at least 3 months)")
                
            # Extract time series data
            dates = []
            income_series = []
            expense_series = []
            savings_series = []
            
            # Query for investment transactions to exclude from expense calculations
            investment_stats = {}
            
            # Get category statistics for investments
            investment_categories = db.query(CategoryStatistics).filter(
                CategoryStatistics.period == StatisticsPeriod.MONTHLY,
                CategoryStatistics.date >= two_years_ago,
                CategoryStatistics.transaction_type == TransactionType.EXPENSE,
                CategoryStatistics.category_name == ExpenseCategory.INVESTMENTS.value
            ).order_by(CategoryStatistics.date).all()
            
            # Create a lookup of investment amounts by month
            for stat in investment_categories:
                month_key = stat.date.strftime('%Y-%m')
                if month_key not in investment_stats:
                    investment_stats[month_key] = 0
                investment_stats[month_key] += stat.period_amount
            
            for stat in monthly_stats:
                dates.append(stat.date)
                income_series.append(stat.period_income)
                
                # Get the month key for looking up investment amounts
                month_key = stat.date.strftime('%Y-%m')
                
                # Subtract investment amount from expenses if available
                investment_amount = investment_stats.get(month_key, 0)
                adjusted_expenses = max(0, stat.period_expenses - investment_amount)
                
                expense_series.append(adjusted_expenses)
                
                savings_series.append(stat.period_net_savings)
            
            # Apply winsorization to handle outliers before calculating averages
            income_series_w = ProjectionService._winsorize(income_series)
            expense_series_w = ProjectionService._winsorize(expense_series)
            savings_series_w = ProjectionService._winsorize(savings_series)
            
            # Calculate averages using winsorized data
            avg_monthly_income = np.mean(income_series_w)
            avg_monthly_expenses = np.mean(expense_series_w)
            avg_monthly_savings = np.mean(savings_series_w)
            
            # Calculate annual growth rates using year-over-year comparison method
            # This provides a more stable and accurate growth rate than month-over-month averages
            annual_income_growth = ProjectionService.calculate_annual_growth(income_series)
            annual_expense_growth = ProjectionService.calculate_annual_growth(expense_series)
            
            # Default to 3% if we can't calculate from historical data
            avg_annual_income_growth = annual_income_growth if annual_income_growth is not None else 0.03
            avg_annual_expense_growth = annual_expense_growth if annual_expense_growth is not None else 0.03
            
            # Calculate average investment rate over the last two years
            financial_health_records = db.query(FinancialHealth)\
                .filter(FinancialHealth.date >= two_years_ago)\
                .order_by(FinancialHealth.date).all()
                
            investment_rates = [record.investment_rate for record in financial_health_records if record.investment_rate is not None]
            avg_investment_rate = np.mean(investment_rates) if investment_rates else 0.10
            
            # Calculate expense breakdown (essential vs discretionary), excluding investments
            category_stats = db.query(CategoryStatistics).filter(
                CategoryStatistics.period == StatisticsPeriod.MONTHLY,
                CategoryStatistics.date >= two_years_ago,
                CategoryStatistics.transaction_type == TransactionType.EXPENSE
            ).order_by(CategoryStatistics.date).all()
            
            # Group stats by month and expense type, excluding investments.
            # Restrict to the months covered by monthly_stats so the expense-type
            # series is aligned with the income/expense series used for growth.
            stat_months = {d.strftime('%Y-%m') for d in dates}
            monthly_expense_stats = {}
            for stat in category_stats:
                # Skip investment expenses
                if stat.category_name == ExpenseCategory.INVESTMENTS.value:
                    continue

                month_key = stat.date.strftime('%Y-%m')
                if month_key not in stat_months:
                    continue
                if month_key not in monthly_expense_stats:
                    monthly_expense_stats[month_key] = {'essential': [], 'discretionary': []}
                
                if stat.expense_type == ExpenseType.FIXED_ESSENTIAL:
                    monthly_expense_stats[month_key]['essential'].append(stat.period_amount)
                else:
                    monthly_expense_stats[month_key]['discretionary'].append(stat.period_amount)
            
            # Extract monthly totals for each expense type in chronological order
            sorted_months = sorted(monthly_expense_stats)
            monthly_essential = [sum(monthly_expense_stats[m]['essential']) for m in sorted_months] if sorted_months else [0]
            monthly_discretionary = [sum(monthly_expense_stats[m]['discretionary']) for m in sorted_months] if sorted_months else [0]
            
            # Calculate annual growth for essential and discretionary expenses using year-over-year comparison
            annual_essential_expense_growth = ProjectionService.calculate_annual_growth(monthly_essential)
            annual_discretionary_expense_growth = ProjectionService.calculate_annual_growth(monthly_discretionary)
            
            # Default to 3% if we can't calculate from historical data
            avg_annual_essential_expense_growth = annual_essential_expense_growth if annual_essential_expense_growth is not None else 0.03
            avg_annual_discretionary_expense_growth = annual_discretionary_expense_growth if annual_discretionary_expense_growth is not None else 0.03
            
            avg_essential_ratio = np.mean(monthly_essential) / avg_monthly_expenses if avg_monthly_expenses > 0 else 0.6
            avg_discretionary_ratio = np.mean(monthly_discretionary) / avg_monthly_expenses if avg_monthly_expenses > 0 else 0.4
            
            avg_expense_to_income_ratio = (avg_monthly_expenses / avg_monthly_income) if avg_monthly_income > 0 else 0.85
            
            # Calculate seasonality (not implemented in this version)
            # This would identify recurring patterns in income/expenses
            
            result = {
                "avg_monthly_income": avg_monthly_income,
                "avg_monthly_expenses": avg_monthly_expenses,
                "avg_monthly_savings": avg_monthly_savings,
                "avg_annual_income_growth": avg_annual_income_growth,
                "avg_annual_expense_growth": avg_annual_expense_growth,  # Overall expense growth
                "avg_annual_essential_expense_growth": avg_annual_essential_expense_growth,
                "avg_annual_discretionary_expense_growth": avg_annual_discretionary_expense_growth,
                "avg_investment_rate": avg_investment_rate,
                "essential_expense_ratio": avg_essential_ratio,
                "discretionary_expense_ratio": avg_discretionary_ratio,
                "avg_expense_to_income_ratio": avg_expense_to_income_ratio,
                "latest_date": dates[-1] if dates else date.today()
            }
            
            # Cache the result
            ProjectionService._historical_data_cache = result
            ProjectionService._cache_timestamp = time.time()
            logger.debug("Historical data cache updated")
            
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing historical data: {str(e)}")
            raise e
    
    @staticmethod
    def calculate_projection(db: Session, scenario_id: int, time_horizon: int = 120) -> List[ProjectionResult]:
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
            
            # Base assumptions are refreshed only by the explicit refresh action
                
            parameters = db.query(ProjectionParameter).filter(
                ProjectionParameter.scenario_id == scenario_id
            ).all()
            
            # Convert parameters to a dictionary
            param_dict = {}
            for param in parameters:
                param_dict[param.param_name] = param.param_value
            
            # Get historical data analysis
            historical_data = ProjectionService.analyze_historical_data(db, force_refresh=True)
            raw_parameters = dict(param_dict)
            defaults = {
                "income_growth_rate": historical_data.get("avg_annual_income_growth", 0.03),
                "essential_expenses_growth_rate": historical_data.get("avg_annual_essential_expense_growth", 0.03),
                "discretionary_expenses_growth_rate": historical_data.get("avg_annual_discretionary_expense_growth", 0.03),
                "investment_rate": historical_data.get("avg_investment_rate", 0.10),
                "investment_return_rate": 0.07, "inflation_rate": 0.02,
                "emergency_fund_target": 6, "holdings_market_value": 0,
            }
            param_dict = {**defaults, **param_dict}
            for name, value in param_dict.items():
                bounds = PARAMETER_BOUNDS.get(name)
                if not math.isfinite(value) or (bounds and not bounds["min"] <= value <= bounds["max"]):
                    raise ValueError(f"Invalid projection assumption: {name}")
            if not 1 <= time_horizon <= 180:
                raise ValueError("Projection horizon must be between 1 and 180 months")
            input_version = source_version(db)
            
            # Clear existing projection results for this scenario
            db.query(ProjectionResult).filter(ProjectionResult.scenario_id == scenario_id).delete()
            
            # Start with current values
            current_date = historical_data["latest_date"]
            current_income = historical_data["avg_monthly_income"]
            current_essential_expenses = historical_data["avg_monthly_expenses"] * historical_data["essential_expense_ratio"]
            current_discretionary_expenses = historical_data["avg_monthly_expenses"] * historical_data["discretionary_expense_ratio"]
            current_investment_rate = param_dict["investment_rate"]
            
            # Guardrail: reserve essential spending before investing monthly surplus
            emergency_fund_target = param_dict["emergency_fund_target"]
            
            # Initialize investment portfolio with current market value if provided
            investment_portfolio = param_dict.get("holdings_market_value", 0)
            
            # Get the latest total_net_savings value from FinancialStatistics
            latest_stats = db.query(FinancialStatistics).filter(
                FinancialStatistics.period == StatisticsPeriod.ALL_TIME
            ).first()
            
            # Use recorded net savings as opening cash, or disclose a zero starting balance if unavailable
            # Add the current market value of investments to the initial net worth
            savings_base = latest_stats.total_net_savings if latest_stats else 0
            cash_balance = savings_base
            initial_net_worth = cash_balance + investment_portfolio
            
            # Calculate monthly growth rates from annual rates
            monthly_income_growth = (1 + param_dict.get("income_growth_rate", historical_data.get("avg_annual_income_growth", 0.03))) ** (1/12) - 1
            monthly_essential_growth = (1 + param_dict.get("essential_expenses_growth_rate", historical_data.get("avg_annual_essential_expense_growth", 0.03))) ** (1/12) - 1
            monthly_discretionary_growth = (1 + param_dict.get("discretionary_expenses_growth_rate", historical_data.get("avg_annual_discretionary_expense_growth", 0.03))) ** (1/12) - 1
            monthly_investment_return = (1 + param_dict.get("investment_return_rate", 0.07)) ** (1/12) - 1
            
            # Generate projection results
            results = []
            net_worth = initial_net_worth
            
            for i in range(time_horizon):
                # Calculate date for this projection point
                projection_date = current_date + relativedelta(months=i+1)
                
                # Apply growth rates
                current_income *= (1 + monthly_income_growth)  # Each projected month advances from the historical baseline
                current_essential_expenses *= (1 + monthly_essential_growth)
                current_discretionary_expenses *= (1 + monthly_discretionary_growth)
                
                # Calculate derived values
                total_expenses = current_essential_expenses + current_discretionary_expenses
                # Preserve spending deficits and restrict contributions to affordable surplus
                surplus = current_income - total_expenses
                reserve_gap = max(0, current_essential_expenses * emergency_fund_target - cash_balance)
                investment_amount = min(max(0, current_income * current_investment_rate), max(0, surplus - reserve_gap))
                savings = current_income - total_expenses - investment_amount
                
                # Update investment portfolio with returns and new investments
                investment_portfolio = (investment_portfolio * (1 + monthly_investment_return)) + investment_amount
                
                # Update net worth
                cash_balance += savings
                net_worth = cash_balance + investment_portfolio  # Cash and investments are disjoint balances
                
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
            
            run = db.get(ProjectionCalculation, scenario_id)
            if run is None:
                run = ProjectionCalculation(scenario_id=scenario_id)
                db.add(run)
            run.calculated_at = datetime.now(timezone.utc)
            run.model_version = MODEL_VERSION
            run.source_version = input_version
            run.time_horizon = time_horizon
            run.parameters = raw_parameters
            run.assumptions = param_dict
            run.starting_cash = savings_base
            run.cash_balance_known = latest_stats is not None
            db.commit()
            return results
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error calculating projection: {str(e)}")
            raise e
    
    @staticmethod
    def get_projection_results(db: Session, scenario_id: int, current_source: Optional[str] = None) -> Dict[str, Any]:
        """Get projection results in a format suitable for visualization
        
        Returns both nominal and real (inflation-adjusted) values.
        Real values are expressed in today's purchasing power.
        """
        try:
            results = db.query(ProjectionResult).filter(
                ProjectionResult.scenario_id == scenario_id
            ).order_by(ProjectionResult.year, ProjectionResult.month).all()
            
            if not results:
                raise ValueError(f"No projection results found for scenario {scenario_id}")
            
            # Get the inflation rate from the assumptions used for this calculation
            provenance = get_provenance(db, scenario_id, current_source)
            annual_inflation_rate = provenance["assumptions"].get("inflation_rate")
            monthly_inflation_rate = (1 + annual_inflation_rate) ** (1/12) - 1 if annual_inflation_rate is not None else 0
            
            # Format results for visualization
            dates = []
            income_series = []
            expense_series = []
            investment_series = []
            savings_series = []
            net_worth_series = []
            
            # Real (inflation-adjusted) series
            real_income_series = []
            real_expense_series = []
            real_investment_series = []
            real_savings_series = []
            real_net_worth_series = []
            
            for i, result in enumerate(results):
                date_str = f"{result.year}-{result.month:02d}"
                dates.append(date_str)
                
                # Nominal values
                income_series.append(round(result.projected_income, 2))
                expense_series.append(round(result.projected_expenses, 2))
                investment_series.append(round(result.projected_investments, 2))
                savings_series.append(round(result.projected_savings, 2))
                net_worth_series.append(round(result.projected_net_worth, 2))
                
                # Calculate cumulative inflation factor (discount factor for real values)
                # Month i+1 because results start from month 1
                cumulative_inflation = (1 + monthly_inflation_rate) ** (i + 1)
                
                # Real values (in today's purchasing power)
                real_income_series.append(round(result.projected_income / cumulative_inflation, 2))
                real_expense_series.append(round(result.projected_expenses / cumulative_inflation, 2))
                real_investment_series.append(round(result.projected_investments / cumulative_inflation, 2))
                real_savings_series.append(round(result.projected_savings / cumulative_inflation, 2))
                real_net_worth_series.append(round(result.projected_net_worth / cumulative_inflation, 2))
            
            # Actual net worth for the months leading up to the projection start
            history = HoldingsHistoryService.get_actual_net_worth(
                db,
                end_month=date(results[0].year, results[0].month, 1) - relativedelta(months=1),
                months=ProjectionService.ACTUAL_HISTORY_MONTHS,
                monthly_inflation_rate=monthly_inflation_rate
            )
            
            if annual_inflation_rate is None:
                history["real_actual_net_worth"] = []
            return {
                **history,
                "dates": dates,
                "projected_income": income_series,
                "projected_expenses": expense_series,
                "projected_investments": investment_series,
                "projected_savings": savings_series,
                "projected_net_worth": net_worth_series,
                "real_projected_income": real_income_series if annual_inflation_rate is not None else [],
                "real_projected_expenses": real_expense_series if annual_inflation_rate is not None else [],
                "real_projected_investments": real_investment_series if annual_inflation_rate is not None else [],
                "real_projected_savings": real_savings_series if annual_inflation_rate is not None else [],
                "real_projected_net_worth": real_net_worth_series if annual_inflation_rate is not None else [],
                "inflation_rate": annual_inflation_rate,
                "provenance": provenance
            }
            
        except Exception as e:
            logger.error(f"Error retrieving projection results: {str(e)}")
            raise e
    
    @staticmethod
    def recompute_base_case_parameters(db: Session) -> Dict[str, Any]:
        """Recompute the parameters of the base case scenario using the latest historical data
        
        This method updates the base case scenario parameters to reflect the most recent
        financial patterns from the user's historical data. It's useful for keeping the
        base case scenario relevant as new financial data is added over time.
        
        Returns:
            Dict containing the scenario ID, name, parameter changes, and a success message
        """
        try:
            # Find the base scenario using the is_base_scenario flag
            base_case = db.query(ProjectionScenario).filter(
                ProjectionScenario.is_base_scenario == True
            ).first()
            
            if not base_case:
                raise ValueError("Base scenario not found. Please ensure one scenario has is_base_scenario set to True.")
                
            # Get current parameters
            current_params = {}
            params = db.query(ProjectionParameter).filter(ProjectionParameter.scenario_id == base_case.id).all()
            for param in params:
                current_params[param.param_name] = {
                    "value": param.param_value,
                    "type": param.param_type
                }
            
            # Get latest historical data (force refresh to ensure we have the most recent data)
            historical_data = ProjectionService.analyze_historical_data(db, force_refresh=True)

            # Derive growth parameters, anchoring expense growth to the income trend
            derived = ProjectionService._derive_growth_parameters(historical_data)

            # Track changes for return value
            changes = {}

            # Update parameters
            for param_name, new_value in derived.items():
                param = db.query(ProjectionParameter).filter(
                    ProjectionParameter.scenario_id == base_case.id,
                    ProjectionParameter.param_name == param_name
                ).first()

                if param:
                    # Record old value
                    old_value = param.param_value

                    # Update with derived value
                    param.param_value = new_value
                    
                    # Track the change
                    changes[param_name] = {
                        "old": old_value,
                        "new": param.param_value,
                        "type": param.param_type.value
                    }
            
            # Commit changes
            db.commit()
            
            # Preserve existing projection results for this scenario
            # so changes can be reviewed before explicitly recalculating
            db.flush()
            
            return {
                "scenario_id": base_case.id,
                "scenario_name": base_case.name,
                "changes": changes,
                "message": "Base Case parameters updated successfully"
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error recomputing base case parameters: {str(e)}")
            raise e
    
    @staticmethod
    def _winsorize(data_series: List[float], limits: float = 0.05) -> List[float]:
        """
        Apply winsorization to a data series by capping extreme values at specified percentile bounds.
        
        Args:
            data_series: List of numerical values.
            limits: Proportion to cut off on each tail (e.g., 0.05 caps at the 5th and 95th percentiles).
            
        Returns:
            List of values with extremes capped to reduce the impact of outliers.
        """
        if not data_series or len(data_series) < 4:
            return data_series
        
        # Convert to numpy array for easier calculations
        data_array = np.array(data_series)
        
        # Compute lower and upper percentile bounds
        lower_pct = limits * 100.0
        upper_pct = 100.0 - lower_pct
        
        lower_bound = np.percentile(data_array, lower_pct)
        upper_bound = np.percentile(data_array, upper_pct)
        
        # Clamp values to bounds
        winsorized = [min(max(x, lower_bound), upper_bound) for x in data_series]
        return winsorized
    
    @staticmethod
    def compare_scenarios(db: Session, scenario_ids: List[int]) -> Dict[str, Any]:
        """Compare multiple scenarios side by side
        
        Returns both nominal and real (inflation-adjusted) values for each scenario.
        """
        try:
            comparison = {
                "scenario_names": [], "dates": [], "net_worth_series": {},
                "savings_series": {}, "investment_series": {}, "real_net_worth_series": {},
                "real_savings_series": {}, "real_investment_series": {}, "inflation_rates": {}, "provenance": {}
            }
            
            # Get each scenario's recorded dates rather than assuming identical horizons
            if not scenario_ids:
                raise ValueError("No scenarios provided for comparison")
            current_source = source_version(db)
            scenarios = [db.get(ProjectionScenario, sid) for sid in dict.fromkeys(scenario_ids)]
            if any(scenario is None for scenario in scenarios):
                raise ValueError("A selected scenario no longer exists")
            datasets = [ProjectionService.get_projection_results(db, scenario.id, current_source) for scenario in scenarios]

            # Set up dates
            comparison["dates"] = sorted({month for data in datasets for month in data["dates"]})
            
            # Get data for each scenario
            for scenario, data in zip(scenarios, datasets):
                duplicate = sum(item.name == scenario.name for item in scenarios) > 1
                label = f"{scenario.name} (#{scenario.id})" if duplicate else scenario.name
                while label in comparison["scenario_names"] or label in {"date", "__actual"}:
                    label = f"{label} (#{scenario.id})"
                comparison["scenario_names"].append(label)
                comparison["provenance"][label] = data["provenance"]
                
                # Get inflation rate used for this scenario's saved calculation
                if data["inflation_rate"] is not None:
                    comparison["inflation_rates"][label] = data["inflation_rate"]
                
                # Extract nominal series
                for key, field in (("net_worth_series", "projected_net_worth"),
                                   ("savings_series", "projected_savings"),
                                   ("investment_series", "projected_investments")):
                    values = dict(zip(data["dates"], data[field]))
                    comparison[key][label] = [values.get(month) for month in comparison["dates"]]
                    
                    # Reuse real values from the same immutable assumption snapshot
                    if data["real_" + field] and len({item["dates"][0] for item in datasets}) == 1:
                        real_values = dict(zip(data["dates"], data["real_" + field]))
                        comparison["real_" + key][label] = [real_values.get(month) for month in comparison["dates"]]

            # Actual net worth leading up to the earliest projection start (shared by all scenarios).
            # Real history is omitted when inflation assumptions or reference months differ.
            start = date.fromisoformat(comparison["dates"][0] + "-01")
            comparison.update(HoldingsHistoryService.get_actual_net_worth(
                db, end_month=start - relativedelta(months=1), months=ProjectionService.ACTUAL_HISTORY_MONTHS,
                monthly_inflation_rate=0
            ))
            same_basis = len({(data["dates"][0], data["inflation_rate"]) for data in datasets}) == 1
            comparison["real_actual_net_worth"] = datasets[0]["real_actual_net_worth"] if same_basis and datasets[0]["inflation_rate"] is not None else []
            
            return comparison
            
        except Exception as e:
            logger.error(f"Error comparing scenarios: {str(e)}")
            raise e
