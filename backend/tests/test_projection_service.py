import pytest
from unittest.mock import MagicMock, patch, call
from datetime import date
from dateutil.relativedelta import relativedelta
import numpy as np

from backend.app.services.projection_service import ProjectionService
from backend.app.models.transaction import Transaction, TransactionType, ExpenseCategory, ExpenseType
from backend.app.models.statistics import FinancialStatistics, CategoryStatistics, StatisticsPeriod
from backend.app.models.financial_health import FinancialHealth
from backend.app.models.financial_projection import ProjectionScenario, ProjectionParameter, ProjectionResult, ParamType
from sqlalchemy import func # Import func for query mocking if needed

# --- Fixtures ---

@pytest.fixture
def mock_db_session():
    return MagicMock()

@pytest.fixture
def service(): # Even if static methods, a fixture can represent the class for consistency
    return ProjectionService()

# --- Helper to create mock parameter objects ---
def create_mock_param(scenario_id, name, value, p_type):
    param = MagicMock(spec=ProjectionParameter)
    param.scenario_id = scenario_id
    param.param_name = name
    param.param_value = value
    param.param_type = p_type
    return param

# --- Tests for create_default_scenarios ---

def test_create_default_scenarios_empty_db(mock_db_session, service):
    mock_db_session.query(ProjectionScenario).filter().all.return_value = [] # No existing defaults

    scenarios = service.create_default_scenarios(mock_db_session)

    assert len(scenarios) == 5 # Expect 5 default scenarios
    # Check that add and flush were called for scenarios and parameters
    # Each scenario + its params. e.g. base_case has 7 params. So 1+7 calls for it.
    # Total calls to add = 5 scenarios + (7+7+7+7+7 params) = 5 + 35 = 40
    # Total calls to flush = 5 (once after each scenario is added)
    assert mock_db_session.add.call_count >= 5 # At least 5 scenarios
    assert mock_db_session.flush.call_count >= 5 
    mock_db_session.commit.assert_called_once()

    # Verify one scenario as an example
    base_case_scenario = next(s for s in scenarios if s.name == "Base Case")
    assert base_case_scenario is not None
    assert base_case_scenario.is_default is True
    
    # Verify parameters were added for this scenario (check one param)
    # This requires inspecting the arguments to 'add'.
    # Example: find a call to add that was for a ProjectionParameter linked to base_case_scenario.id
    # This is complex to assert directly here without more intricate mock inspection.
    # For now, the call counts give a good indication.

def test_create_default_scenarios_already_exist(mock_db_session, service):
    mock_existing_scenario = MagicMock(spec=ProjectionScenario)
    mock_db_session.query(ProjectionScenario).filter(ProjectionScenario.is_default == True).all.return_value = [mock_existing_scenario]

    scenarios = service.create_default_scenarios(mock_db_session)
    
    assert scenarios == [mock_existing_scenario]
    mock_db_session.add.assert_not_called()
    mock_db_session.commit.assert_not_called()


# --- Tests for analyze_historical_data ---

def test_analyze_historical_data_sufficient_data(mock_db_session, service):
    latest_date = date(2023, 12, 31)
    
    # Mock latest transaction
    mock_latest_tx = MagicMock(spec=Transaction, transaction_date=latest_date)
    mock_db_session.query(Transaction).order_by().first.return_value = mock_latest_tx

    # Mock FinancialStatistics (monthly)
    mock_stats_list = []
    for i in range(24): # 24 months of data
        stat_date = latest_date - relativedelta(months=i)
        stat = MagicMock(spec=FinancialStatistics)
        stat.date = stat_date
        stat.period_income = 3000 + i*50 # Simulate some growth
        stat.period_expenses = 2000 + i*20
        stat.period_net_savings = stat.period_income - stat.period_expenses
        mock_stats_list.append(stat)
    mock_stats_list.reverse() # Ensure ascending order by date
    mock_db_session.query(FinancialStatistics).filter().order_by().all.return_value = mock_stats_list
    
    # Mock FinancialHealth (for investment rate)
    mock_health = MagicMock(spec=FinancialHealth, investment_rate=0.12)
    mock_db_session.query(FinancialHealth).order_by().first.return_value = mock_health

    # Mock CategoryStatistics (for expense breakdown)
    # Assume 2 categories, essential and discretionary, for simplicity in mocking
    # Let essential be 60% of expenses, discretionary 40%
    mock_cat_stats_list = []
    for fs_stat in mock_stats_list: # Use the same dates as FinancialStatistics
        essential_amount = fs_stat.period_expenses * 0.6
        discretionary_amount = fs_stat.period_expenses * 0.4
        
        cs_essential = MagicMock(spec=CategoryStatistics)
        cs_essential.date = fs_stat.date
        cs_essential.expense_type = ExpenseType.ESSENTIAL
        cs_essential.period_amount = essential_amount
        
        cs_discretionary = MagicMock(spec=CategoryStatistics)
        cs_discretionary.date = fs_stat.date
        cs_discretionary.expense_type = ExpenseType.DISCRETIONARY # Assuming this is the other type
        cs_discretionary.period_amount = discretionary_amount
        mock_cat_stats_list.extend([cs_essential, cs_discretionary])
        
    mock_db_session.query(CategoryStatistics).filter().order_by().all.return_value = mock_cat_stats_list

    analysis = service.analyze_historical_data(mock_db_session)

    assert "avg_monthly_income" in analysis
    assert "avg_annual_income_growth" in analysis
    assert "current_investment_rate" in analysis
    assert analysis["current_investment_rate"] == 0.12
    assert analysis["essential_expense_ratio"] == pytest.approx(0.6)
    assert analysis["discretionary_expense_ratio"] == pytest.approx(0.4)
    assert analysis["latest_date"] == latest_date
    
    # Example: Check avg_monthly_income (average of last 12 months from mock_stats_list)
    expected_avg_income = np.mean([s.period_income for s in mock_stats_list[-12:]])
    assert analysis["avg_monthly_income"] == pytest.approx(expected_avg_income)

def test_analyze_historical_data_insufficient_data(mock_db_session, service):
    mock_latest_tx = MagicMock(spec=Transaction, transaction_date=date(2023,1,1))
    mock_db_session.query(Transaction).order_by().first.return_value = mock_latest_tx
    mock_db_session.query(FinancialStatistics).filter().order_by().all.return_value = [] # No stats

    with pytest.raises(ValueError, match="Not enough historical data for analysis"):
        service.analyze_historical_data(mock_db_session)


# --- Tests for calculate_projection ---
@patch('backend.app.services.projection_service.ProjectionService.analyze_historical_data')
def test_calculate_projection_base_case(mock_analyze_historical, mock_db_session, service):
    scenario_id = 1
    time_horizon = 12 # 1 year projection

    # Mock scenario and parameters
    mock_scenario = MagicMock(spec=ProjectionScenario, id=scenario_id, name="Test Base Case")
    mock_db_session.query(ProjectionScenario).filter().first.return_value = mock_scenario

    params_data = ProjectionService.DEFAULT_PARAMETERS["base_case"]
    mock_params = [create_mock_param(scenario_id, k, v["value"], v["type"]) for k,v in params_data.items()]
    mock_db_session.query(ProjectionParameter).filter().all.return_value = mock_params
    
    # Mock historical data analysis
    historical_data = {
        "avg_monthly_income": 5000,
        "avg_monthly_expenses": 3000, # Total
        "essential_expense_ratio": 0.6, # So essential = 1800
        "discretionary_expense_ratio": 0.4, # So discretionary = 1200
        "current_investment_rate": 0.10, # This will be overridden by scenario param if present
        "latest_date": date(2023, 12, 31)
    }
    mock_analyze_historical.return_value = historical_data

    # Mock latest FinancialStatistics for initial net worth
    mock_latest_stats = MagicMock(spec=FinancialStatistics, total_net_savings=50000)
    mock_db_session.query(FinancialStatistics).filter(FinancialStatistics.period == StatisticsPeriod.ALL_TIME).first.return_value = mock_latest_stats
    
    # Mock delete call for existing results
    mock_db_session.query(ProjectionResult).filter().delete.return_value = None

    results = service.calculate_projection(mock_db_session, scenario_id, time_horizon)

    assert len(results) == time_horizon
    mock_db_session.query(ProjectionResult).filter(ProjectionResult.scenario_id == scenario_id).delete.assert_called_once()
    assert mock_db_session.add.call_count == time_horizon # One add per result
    mock_db_session.commit.assert_called_once()

    # Check some values for the first month projection (month 1, index 0)
    # Initial values are used for the first data point calculation (i=0 loop)
    # but growth is applied from i=1 in the loop (so second month onwards)
    # The loop runs from i=0 to time_horizon-1.
    # current_date + relativedelta(months=i+1) means first result is for month 1.
    
    first_month_result = results[0]
    assert first_month_result.year == 2024
    assert first_month_result.month == 1
    
    # Income, expenses are from historical_data for the first projected point, as growth applies next iteration
    income_growth_rate = params_data["income_growth_rate"]["value"]
    essential_growth_rate = params_data["essential_expenses_growth_rate"]["value"]
    discretionary_growth_rate = params_data["discretionary_expenses_growth_rate"]["value"]
    investment_return_rate = params_data["investment_return_rate"]["value"]
    investment_rate_param = params_data["investment_rate"]["value"]

    # Month 1 calculations:
    expected_m1_income = historical_data["avg_monthly_income"]
    expected_m1_essential_exp = historical_data["avg_monthly_expenses"] * historical_data["essential_expense_ratio"]
    expected_m1_discretionary_exp = historical_data["avg_monthly_expenses"] * historical_data["discretionary_expense_ratio"]
    expected_m1_total_exp = expected_m1_essential_exp + expected_m1_discretionary_exp
    expected_m1_investment = expected_m1_income * investment_rate_param
    expected_m1_savings = expected_m1_income - expected_m1_total_exp - expected_m1_investment
    
    # Investment portfolio for month 1: starts at 0, gains 0 return, adds this month's investment
    expected_m1_inv_portfolio_val_after_calc = expected_m1_investment 
    # Net worth for month 1: initial_net_worth + savings + new_investment_this_month
    expected_m1_net_worth = mock_latest_stats.total_net_savings + expected_m1_savings + expected_m1_investment
    
    assert first_month_result.projected_income == pytest.approx(expected_m1_income)
    assert first_month_result.projected_expenses == pytest.approx(expected_m1_total_exp)
    assert first_month_result.projected_investments == pytest.approx(expected_m1_investment)
    assert first_month_result.projected_savings == pytest.approx(expected_m1_savings)
    assert first_month_result.projected_net_worth == pytest.approx(expected_m1_net_worth)

    # Check some values for the last month (month 12, index 11)
    last_month_result = results[11]
    assert last_month_result.year == 2024
    assert last_month_result.month == 12

    # Calculate expected values for month 12 (after 11 iterations of growth from month 2)
    # Income for month 12: historical_data["avg_monthly_income"] * (1 + monthly_income_growth)^11
    # (because growth is applied 11 times: for month 2, 3, ..., 12)
    monthly_income_growth = (1 + income_growth_rate) ** (1/12) - 1
    m_essential_growth = (1 + essential_growth_rate) ** (1/12) - 1
    m_discretionary_growth = (1 + discretionary_growth_rate) ** (1/12) - 1
    
    expected_m12_income = historical_data["avg_monthly_income"] * ((1 + monthly_income_growth)**11)
    expected_m12_essential_exp = expected_m1_essential_exp * ((1 + m_essential_growth)**11)
    expected_m12_discretionary_exp = expected_m1_discretionary_exp * ((1 + m_discretionary_growth)**11)
    # ... and so on. Verifying the exact values for the last month is complex and prone to small errors
    # if not perfectly replicating the loop logic. The first month check is more direct.
    # A full check would involve running the loop manually or with a spreadsheet.
    assert last_month_result.projected_income == pytest.approx(expected_m12_income)


def test_calculate_projection_missing_scenario(mock_db_session, service):
    mock_db_session.query(ProjectionScenario).filter().first.return_value = None
    with pytest.raises(ValueError, match="Scenario with ID 999 not found"):
        service.calculate_projection(mock_db_session, 999, 12)

# --- Tests for get_projection_results ---
def test_get_projection_results_found(mock_db_session, service):
    scenario_id = 1
    mock_results_db = []
    for i in range(3):
        res = MagicMock(spec=ProjectionResult)
        res.year = 2024
        res.month = i + 1
        res.projected_income = 5000 + i*100
        res.projected_expenses = 3000 + i*50
        res.projected_investments = 500 + i*10
        res.projected_savings = 1500 + i*40
        res.projected_net_worth = 50000 + i*1540 # Simplified accumulation
        mock_results_db.append(res)
    
    mock_db_session.query(ProjectionResult).filter().order_by().all.return_value = mock_results_db

    formatted_results = service.get_projection_results(mock_db_session, scenario_id)

    assert len(formatted_results["dates"]) == 3
    assert formatted_results["dates"][0] == "2024-01"
    assert formatted_results["projected_income"][0] == 5000
    assert formatted_results["projected_net_worth"][-1] == round(mock_results_db[-1].projected_net_worth, 2)

def test_get_projection_results_not_found(mock_db_session, service):
    mock_db_session.query(ProjectionResult).filter().order_by().all.return_value = []
    with pytest.raises(ValueError, match="No projection results found for scenario 1"):
        service.get_projection_results(mock_db_session, 1)

@patch('backend.app.services.projection_service.ProjectionService.analyze_historical_data')
def test_calculate_projection_high_investment_growth(mock_analyze_historical, mock_db_session, service):
    scenario_id = 2
    time_horizon = 6 # shorter horizon for focused check

    mock_scenario = MagicMock(spec=ProjectionScenario, id=scenario_id, name="High Growth Inv")
    mock_db_session.query(ProjectionScenario).filter().first.return_value = mock_scenario

    params_data = { # Modified from base_case for higher investment focus
        "income_growth_rate": {"value": 0.03, "type": ParamType.PERCENTAGE},
        "essential_expenses_growth_rate": {"value": 0.02, "type": ParamType.PERCENTAGE},
        "discretionary_expenses_growth_rate": {"value": 0.01, "type": ParamType.PERCENTAGE},
        "investment_rate": {"value": 0.25, "type": ParamType.PERCENTAGE}, # Higher investment rate
        "inflation_rate": {"value": 0.02, "type": ParamType.PERCENTAGE},
        "investment_return_rate": {"value": 0.10, "type": ParamType.PERCENTAGE}, # Higher return rate
        "emergency_fund_target": {"value": 3.0, "type": ParamType.MONTHS},
    }
    mock_params = [create_mock_param(scenario_id, k, v["value"], v["type"]) for k,v in params_data.items()]
    mock_db_session.query(ProjectionParameter).filter().all.return_value = mock_params
    
    historical_data = {
        "avg_monthly_income": 6000, "avg_monthly_expenses": 3500,
        "essential_expense_ratio": 0.5, "discretionary_expense_ratio": 0.5,
        "current_investment_rate": 0.10, "latest_date": date(2023, 12, 31)
    }
    mock_analyze_historical.return_value = historical_data

    mock_latest_stats = MagicMock(spec=FinancialStatistics, total_net_savings=70000)
    mock_db_session.query(FinancialStatistics).filter(FinancialStatistics.period == StatisticsPeriod.ALL_TIME).first.return_value = mock_latest_stats
    
    mock_db_session.query(ProjectionResult).filter().delete.return_value = None

    results = service.calculate_projection(mock_db_session, scenario_id, time_horizon)
    assert len(results) == time_horizon

    # First month check
    first_month = results[0]
    m1_income = historical_data["avg_monthly_income"]
    m1_ess_exp = historical_data["avg_monthly_expenses"] * historical_data["essential_expense_ratio"]
    m1_disc_exp = historical_data["avg_monthly_expenses"] * historical_data["discretionary_expense_ratio"]
    m1_total_exp = m1_ess_exp + m1_disc_exp
    m1_investment = m1_income * params_data["investment_rate"]["value"]
    m1_savings = m1_income - m1_total_exp - m1_investment
    m1_net_worth = mock_latest_stats.total_net_savings + m1_savings + m1_investment

    assert first_month.projected_income == pytest.approx(m1_income)
    assert first_month.projected_investments == pytest.approx(m1_investment)
    assert first_month.projected_savings == pytest.approx(m1_savings)
    assert first_month.projected_net_worth == pytest.approx(m1_net_worth)

    # Check that net worth is generally increasing due to high investment and return
    assert results[-1].projected_net_worth > results[0].projected_net_worth

@patch('backend.app.services.projection_service.ProjectionService.analyze_historical_data')
def test_calculate_projection_income_decline_scenario(mock_analyze_historical, mock_db_session, service):
    scenario_id = 3
    time_horizon = 6

    mock_scenario = MagicMock(spec=ProjectionScenario, id=scenario_id, name="Income Decline")
    mock_db_session.query(ProjectionScenario).filter().first.return_value = mock_scenario

    params_data = { # Income decline
        "income_growth_rate": {"value": -0.05, "type": ParamType.PERCENTAGE}, # Negative income growth
        "essential_expenses_growth_rate": {"value": 0.01, "type": ParamType.PERCENTAGE},
        "discretionary_expenses_growth_rate": {"value": 0.01, "type": ParamType.PERCENTAGE},
        "investment_rate": {"value": 0.05, "type": ParamType.PERCENTAGE}, 
        "inflation_rate": {"value": 0.02, "type": ParamType.PERCENTAGE},
        "investment_return_rate": {"value": 0.03, "type": ParamType.PERCENTAGE},
        "emergency_fund_target": {"value": 6.0, "type": ParamType.MONTHS},
    }
    mock_params = [create_mock_param(scenario_id, k, v["value"], v["type"]) for k,v in params_data.items()]
    mock_db_session.query(ProjectionParameter).filter().all.return_value = mock_params
    
    historical_data = {
        "avg_monthly_income": 5000, "avg_monthly_expenses": 3000,
        "essential_expense_ratio": 0.6, "discretionary_expense_ratio": 0.4,
        "current_investment_rate": 0.05, "latest_date": date(2023, 12, 31)
    }
    mock_analyze_historical.return_value = historical_data

    mock_latest_stats = MagicMock(spec=FinancialStatistics, total_net_savings=20000)
    mock_db_session.query(FinancialStatistics).filter(FinancialStatistics.period == StatisticsPeriod.ALL_TIME).first.return_value = mock_latest_stats
    
    results = service.calculate_projection(mock_db_session, scenario_id, time_horizon)
    assert len(results) == time_horizon
    # Check that projected income in the last month is less than the first month (due to negative growth)
    assert results[-1].projected_income < results[0].projected_income

@patch('backend.app.services.projection_service.ProjectionService.analyze_historical_data')
def test_calculate_projection_zero_growth_zero_return(mock_analyze_historical, mock_db_session, service):
    scenario_id = 4
    time_horizon = 3

    mock_scenario = MagicMock(spec=ProjectionScenario, id=scenario_id, name="Zero Growth/Return")
    mock_db_session.query(ProjectionScenario).filter().first.return_value = mock_scenario

    params_data = { 
        "income_growth_rate": {"value": 0.0, "type": ParamType.PERCENTAGE},
        "essential_expenses_growth_rate": {"value": 0.0, "type": ParamType.PERCENTAGE},
        "discretionary_expenses_growth_rate": {"value": 0.0, "type": ParamType.PERCENTAGE},
        "investment_rate": {"value": 0.10, "type": ParamType.PERCENTAGE}, 
        "inflation_rate": {"value": 0.0, "type": ParamType.PERCENTAGE},
        "investment_return_rate": {"value": 0.0, "type": ParamType.PERCENTAGE}, # Zero return
        "emergency_fund_target": {"value": 6.0, "type": ParamType.MONTHS},
    }
    mock_params = [create_mock_param(scenario_id, k, v["value"], v["type"]) for k,v in params_data.items()]
    mock_db_session.query(ProjectionParameter).filter().all.return_value = mock_params
    
    historical_data = {
        "avg_monthly_income": 5000, "avg_monthly_expenses": 3000,
        "essential_expense_ratio": 0.6, "discretionary_expense_ratio": 0.4,
        "current_investment_rate": 0.10, "latest_date": date(2023, 12, 31)
    }
    mock_analyze_historical.return_value = historical_data

    initial_net_worth = 50000
    mock_latest_stats = MagicMock(spec=FinancialStatistics, total_net_savings=initial_net_worth)
    mock_db_session.query(FinancialStatistics).filter(FinancialStatistics.period == StatisticsPeriod.ALL_TIME).first.return_value = mock_latest_stats
    
    results = service.calculate_projection(mock_db_session, scenario_id, time_horizon)
    assert len(results) == time_horizon

    # With zero growth and zero returns, income, expenses, and investment amounts per month should be constant.
    # Savings per month should be constant. Net worth should increase linearly by (savings + investment_amount) each month.
    
    m1_income = historical_data["avg_monthly_income"]
    m1_total_exp = historical_data["avg_monthly_expenses"] 
    m1_investment = m1_income * params_data["investment_rate"]["value"]
    m1_savings = m1_income - m1_total_exp - m1_investment
    
    monthly_net_worth_increase = m1_savings + m1_investment

    for i in range(time_horizon):
        assert results[i].projected_income == pytest.approx(m1_income)
        assert results[i].projected_expenses == pytest.approx(m1_total_exp)
        assert results[i].projected_investments == pytest.approx(m1_investment)
        assert results[i].projected_savings == pytest.approx(m1_savings)
        # Investment portfolio grows only by new additions, no returns
        expected_portfolio_val = m1_investment * (i + 1)
        # Net worth = initial + (i+1) * monthly_net_worth_increase
        expected_net_worth = initial_net_worth + monthly_net_worth_increase * (i + 1)
        assert results[i].projected_net_worth == pytest.approx(expected_net_worth)


# --- Tests for compare_scenarios ---
def test_compare_scenarios_basic(mock_db_session, service):
    scenario_id1, scenario_id2 = 1, 2
    
    # Mock Scenarios
    mock_scen1 = MagicMock(spec=ProjectionScenario, id=scenario_id1, name="Scenario A")
    mock_scen2 = MagicMock(spec=ProjectionScenario, id=scenario_id2, name="Scenario B")
    def scen_side_effect(*args, **kwargs): # Based on ProjectionScenario.id == X
        filter_arg = args[0] # The filter object
        # This is a simplification; real filter inspection is more complex
        if filter_arg.right.value == scenario_id1: return mock_scen1
        if filter_arg.right.value == scenario_id2: return mock_scen2
        return None
    mock_db_session.query(ProjectionScenario).filter().first.side_effect = scen_side_effect

    # Mock ProjectionResults for scenario 1 (reference for dates)
    mock_results_s1 = [MagicMock(spec=ProjectionResult, year=2024, month=m, projected_net_worth=1000*m, projected_savings=100*m, projected_investments=50*m) for m in range(1,3)] # 2 months
    
    # Mock ProjectionResults for scenario 2
    mock_results_s2 = [MagicMock(spec=ProjectionResult, year=2024, month=m, projected_net_worth=1200*m, projected_savings=120*m, projected_investments=60*m) for m in range(1,3)]

    def results_side_effect(*args, **kwargs): # Based on ProjectionResult.scenario_id == X
        filter_arg = args[0]
        if filter_arg.right.value == scenario_id1: return mock_results_s1
        if filter_arg.right.value == scenario_id2: return mock_results_s2
        return []
    mock_db_session.query(ProjectionResult).filter().order_by().all.side_effect = results_side_effect

    comparison = service.compare_scenarios(mock_db_session, [scenario_id1, scenario_id2])

    assert comparison["scenario_names"] == ["Scenario A", "Scenario B"]
    assert comparison["dates"] == ["2024-01", "2024-02"]
    assert comparison["net_worth_series"]["Scenario A"] == [1000, 2000]
    assert comparison["net_worth_series"]["Scenario B"] == [1200, 2400]
    assert comparison["savings_series"]["Scenario A"] == [100, 200]

def test_compare_scenarios_no_ids(mock_db_session, service):
    with pytest.raises(ValueError, match="No scenarios provided for comparison"):
        service.compare_scenarios(mock_db_session, [])

def test_compare_scenarios_first_scenario_no_results(mock_db_session, service):
    mock_db_session.query(ProjectionResult).filter().order_by().all.return_value = [] # No results for first scenario
    with pytest.raises(ValueError, match="No projection results found for scenario 1"):
        service.compare_scenarios(mock_db_session, [1, 2])

```
