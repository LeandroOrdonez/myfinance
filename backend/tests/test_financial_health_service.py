import pytest
from unittest.mock import MagicMock, patch, call
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
import calendar

from backend.app.services.financial_health_service import FinancialHealthService
from backend.app.models.transaction import Transaction, TransactionType, ExpenseCategory
from backend.app.models.statistics import FinancialStatistics, CategoryStatistics, StatisticsPeriod
from backend.app.models.financial_health import FinancialHealth, FinancialRecommendation
from sqlalchemy import func, text # Added func and text

# --- Mock Data & Fixtures ---

@pytest.fixture
def mock_db_session():
    return MagicMock()

@pytest.fixture
def service():
    # The service itself is mostly static methods, so an instance isn't strictly needed
    # unless we were testing instance methods. For now, we call static methods directly.
    return FinancialHealthService()

# --- Tests for _score_component ---

@pytest.mark.parametrize("value, thresholds_key, higher_is_better, expected_score_category", [
    # Savings Rate (higher is better)
    (0.25, "savings_rate", True, "excellent"), # > 20%
    (0.17, "savings_rate", True, "good"),      # 15-20%
    (0.12, "savings_rate", True, "average"),   # 10-15%
    (0.07, "savings_rate", True, "poor"),      # 5-10%
    (0.02, "savings_rate", True, "critical"),  # < 5%
    # Expense Ratio (lower is better)
    (0.55, "expense_ratio", False, "excellent"), # < 60%
    (0.65, "expense_ratio", False, "good"),      # 60-70%
    (0.75, "expense_ratio", False, "average"),   # 70-80%
    (0.85, "expense_ratio", False, "poor"),      # 80-90%
    (0.95, "expense_ratio", False, "critical"),  # > 90%
    # Emergency Fund (higher is better)
    (7.0, "emergency_fund", True, "excellent"), # > 6 months
    (5.0, "emergency_fund", True, "good"),      # 4-6 months
    (3.5, "emergency_fund", True, "average"),   # 3-4 months
    (2.0, "emergency_fund", True, "poor"),      # 1-3 months
    (0.5, "emergency_fund", True, "critical"),  # < 1 month
])
def test_score_component_categories(service, value, thresholds_key, higher_is_better, expected_score_category):
    thresholds = FinancialHealthService.THRESHOLDS[thresholds_key]
    score = service._score_component(value, thresholds, higher_is_better)
    
    if 80 <= score <= 100:
        category = "excellent"
    elif 60 <= score < 80:
        category = "good"
    elif 40 <= score < 60:
        category = "average"
    elif 20 <= score < 40:
        category = "poor"
    else: 
        category = "critical"
    
    assert category == expected_score_category

def test_score_component_interpolation(service):
    thresholds_sr = FinancialHealthService.THRESHOLDS["savings_rate"]
    assert service._score_component(0.15, thresholds_sr, True) == 60.0 
    assert service._score_component(0.175, thresholds_sr, True) == 70.0

    thresholds_er = FinancialHealthService.THRESHOLDS["expense_ratio"]
    assert service._score_component(0.70, thresholds_er, False) == 60.0
    assert service._score_component(0.65, thresholds_er, False) == 70.0
    
    assert service._score_component(0.01, thresholds_sr, True) == 0.0 
    assert service._score_component(0.99, thresholds_er, False) == 0.0

# --- Tests for _calculate_debt_to_income ---
def test_calculate_debt_to_income_normal(mock_db_session, service):
    target_date = date(2023, 3, 15)
    
    mock_db_session.query(func.sum(Transaction.amount)).filter().scalar.side_effect = [-300.00, 2000.00]

    score, ratio = service._calculate_debt_to_income(mock_db_session, target_date)

    assert ratio == 300 / 2000  
    expected_score = service._score_component(0.15, FinancialHealthService.THRESHOLDS["debt_to_income"], False)
    assert score == expected_score
    assert 80 <= score <= 100 

    assert mock_db_session.query(func.sum(Transaction.amount)).filter.call_count == 2

def test_calculate_debt_to_income_no_income(mock_db_session, service):
    target_date = date(2023, 3, 15)
    mock_db_session.query(func.sum(Transaction.amount)).filter().scalar.side_effect = [-300.00, 0.00] 

    score, ratio = service._calculate_debt_to_income(mock_db_session, target_date)
    assert ratio == 1.0 
    assert score == 0.0 

def test_calculate_debt_to_income_no_debt(mock_db_session, service):
    target_date = date(2023, 3, 15)
    mock_db_session.query(func.sum(Transaction.amount)).filter().scalar.side_effect = [0.00, 2000.00] 

    score, ratio = service._calculate_debt_to_income(mock_db_session, target_date)
    assert ratio == 0.0
    expected_score = service._score_component(0.0, FinancialHealthService.THRESHOLDS["debt_to_income"], False)
    assert score == expected_score
    assert score == 100.0


# --- Tests for _calculate_investment_rate ---
def test_calculate_investment_rate_normal(mock_db_session, service):
    target_date = date(2023, 3, 15)
    mock_db_session.query(func.sum(Transaction.amount)).filter().scalar.side_effect = [3000.00, -300.00] 

    score, rate = service._calculate_investment_rate(mock_db_session, target_date)

    assert rate == 300 / 3000 
    expected_score = service._score_component(0.10, FinancialHealthService.THRESHOLDS["investment_rate"], True)
    assert score == expected_score 
    assert 60 <= score < 80

def test_calculate_investment_rate_no_income(mock_db_session, service):
    target_date = date(2023, 3, 15)
    mock_db_session.query(func.sum(Transaction.amount)).filter().scalar.side_effect = [0.00, -100.00]
    
    score, rate = service._calculate_investment_rate(mock_db_session, target_date)
    assert rate == 0.0
    assert score == 0.0 

def test_calculate_investment_rate_no_investments(mock_db_session, service):
    target_date = date(2023, 3, 15)
    mock_db_session.query(func.sum(Transaction.amount)).filter().scalar.side_effect = [3000.00, 0.00]

    score, rate = service._calculate_investment_rate(mock_db_session, target_date)
    assert rate == 0.0
    expected_score = service._score_component(0.0, FinancialHealthService.THRESHOLDS["investment_rate"], True)
    assert score == expected_score
    assert score == 0.0

# --- Tests for _calculate_spending_stability ---
def test_calculate_spending_stability_stable(mock_db_session, service):
    target_date = date(2023, 6, 15)
    mock_expenses_query = mock_db_session.query(FinancialStatistics.period_expenses).filter()
    mock_expenses_query.all.return_value = [(1000,), (1050,), (950,), (1020,), (980,), (1000,)]

    score, stability_coeff_of_variation_inverted = service._calculate_spending_stability(mock_db_session, target_date)
    
    assert stability_coeff_of_variation_inverted == pytest.approx(0.96891, abs=1e-4)
    expected_score = service._score_component(stability_coeff_of_variation_inverted, FinancialHealthService.THRESHOLDS["spending_stability"], True)
    assert score == expected_score
    assert 80 <= score <= 100

def test_calculate_spending_stability_unstable(mock_db_session, service):
    target_date = date(2023, 6, 15)
    mock_expenses_query = mock_db_session.query(FinancialStatistics.period_expenses).filter()
    mock_expenses_query.all.return_value = [(500,), (1500,), (200,), (1800,), (1000,), (700,)]
    
    score, stability = service._calculate_spending_stability(mock_db_session, target_date)
    assert stability == pytest.approx(0.4148, abs=1e-4)
    expected_score = service._score_component(stability, FinancialHealthService.THRESHOLDS["spending_stability"], True)
    assert score == expected_score
    assert 0 <= score < 20 

def test_calculate_spending_stability_insufficient_data(mock_db_session, service):
    target_date = date(2023, 6, 15)
    mock_db_session.query(FinancialStatistics.period_expenses).filter().all.return_value = [(1000,), (1050,)] 
    score, stability = service._calculate_spending_stability(mock_db_session, target_date)
    assert score == 50.0  
    assert stability == 0.5 

# --- Tests for _generate_recommendations (Basic) ---
def test_generate_recommendations_low_savings_rate(service):
    recs = service._generate_recommendations(
        savings_rate_score=10, expense_ratio_score=70, budget_adherence_score=70,
        debt_to_income_score=70, emergency_fund_score=70, spending_stability_score=70,
        investment_rate_score=70, savings_rate=0.05, expense_ratio=0.6,
        budget_adherence=0.8, debt_to_income=0.2, emergency_fund_months=4,
        spending_stability=0.8, investment_rate=0.1
    )
    assert any(rec["category"] == "savings_rate" and "Increase Your Savings Rate" in rec["title"] for rec in recs)
    assert any(rec["category"] == "savings_rate" and "50/30/20 Budget Rule" in rec["title"] for rec in recs)

def test_generate_recommendations_high_expense_ratio(service):
    recs = service._generate_recommendations(
        savings_rate_score=70, expense_ratio_score=10, budget_adherence_score=70,
        debt_to_income_score=70, emergency_fund_score=70, spending_stability_score=70,
        investment_rate_score=70, savings_rate=0.20, expense_ratio=0.9,
        budget_adherence=0.8, debt_to_income=0.2, emergency_fund_months=4,
        spending_stability=0.8, investment_rate=0.1
    )
    assert any(rec["category"] == "expense_ratio" and "Reduce Your Expense-to-Income Ratio" in rec["title"] for rec in recs)
    assert any(rec["category"] == "expense_ratio" and "Review Subscriptions" in rec["title"] for rec in recs)

def test_generate_recommendations_low_emergency_fund(service):
    recs = service._generate_recommendations(
        emergency_fund_score=10, emergency_fund_months=0.5,
        savings_rate_score=70, expense_ratio_score=70, budget_adherence_score=70,
        debt_to_income_score=70, spending_stability_score=70,
        investment_rate_score=70, savings_rate=0.20, expense_ratio=0.6,
        budget_adherence=0.8, debt_to_income=0.2, 
        spending_stability=0.8, investment_rate=0.1
    )
    assert any(rec["category"] == "emergency_fund" and "Build Your Emergency Fund" in rec["title"] for rec in recs)
    assert any(rec["category"] == "emergency_fund" and "Start a €1,000 Emergency Fund" in rec["title"] for rec in recs)


# --- Tests for calculate_health_score (Simplified - focusing on flow) ---
@patch('backend.app.services.financial_health_service.FinancialHealthService._calculate_budget_adherence')
@patch('backend.app.services.financial_health_service.FinancialHealthService._calculate_debt_to_income')
@patch('backend.app.services.financial_health_service.FinancialHealthService._calculate_emergency_fund')
@patch('backend.app.services.financial_health_service.FinancialHealthService._calculate_spending_stability')
@patch('backend.app.services.financial_health_service.FinancialHealthService._calculate_investment_rate')
@patch('backend.app.services.financial_health_service.FinancialHealthService._generate_recommendations')
def test_calculate_health_score_flow_with_stats(
    mock_gen_recs, mock_calc_inv_rate, mock_calc_spend_stab, mock_calc_emerg_fund,
    mock_calc_dti, mock_calc_budget_adh, mock_db_session, service
):
    target_date = date(2023, 3, 15)
    last_day_of_month = date(2023, 3, 31)

    mock_db_session.query(FinancialHealth).filter().first.return_value = None
    
    mock_monthly_stats = MagicMock(spec=FinancialStatistics)
    mock_monthly_stats.savings_rate = 15.0 
    mock_monthly_stats.period_income = 3000.00
    mock_monthly_stats.period_expenses = 2000.00
    mock_db_session.query(FinancialStatistics).filter().filter().filter().first.return_value = mock_monthly_stats

    mock_calc_budget_adh.return_value = (75.0, 0.75)
    mock_calc_dti.return_value = (85.0, 0.15)
    mock_calc_emerg_fund.return_value = (65.0, 4.0)
    mock_calc_spend_stab.return_value = (95.0, 0.95)
    mock_calc_inv_rate.return_value = (55.0, 0.08)
    
    mock_recs_list = [{"title": "Test Rec", "description": "Desc", "category": "cat", "impact_area": "area", "priority": 1, "estimated_score_improvement": 5}]
    mock_gen_recs.return_value = mock_recs_list

    health_score_obj = service.calculate_health_score(mock_db_session, target_date, force=False)

    assert health_score_obj is not None
    assert health_score_obj.date == last_day_of_month
    
    assert health_score_obj.savings_rate == 0.15 
    assert 60 <= health_score_obj.savings_rate_score < 80 

    assert health_score_obj.expense_ratio == pytest.approx(2000/3000)
    assert 60 <= health_score_obj.expense_ratio_score < 80 

    mock_calc_budget_adh.assert_called_once_with(mock_db_session, target_date)
    mock_calc_dti.assert_called_once_with(mock_db_session, target_date)

    assert 0 <= health_score_obj.overall_score <= 100

    assert health_score_obj.recommendations == mock_recs_list
    
    assert mock_db_session.add.call_count == 1 + len(mock_recs_list)
    mock_db_session.commit.assert_called() 
    mock_db_session.refresh.assert_called_with(health_score_obj) 


def test_calculate_health_score_no_stats(mock_db_session, service):
    target_date = date(2023, 3, 15)
    last_day_of_month = date(2023, 3, 31)
    mock_db_session.query(FinancialHealth).filter().first.return_value = None 
    mock_db_session.query(FinancialStatistics).filter().filter().filter().first.return_value = None 

    health_score_obj = service.calculate_health_score(mock_db_session, target_date)

    assert health_score_obj.date == last_day_of_month
    assert health_score_obj.overall_score == 0
    assert health_score_obj.savings_rate == 0
    assert health_score_obj.recommendations == [] 
    mock_db_session.add.assert_called_once() 
    mock_db_session.commit.assert_called_once()


def test_calculate_health_score_existing_no_force(mock_db_session, service):
    target_date = date(2023, 3, 15)
    mock_existing = MagicMock(spec=FinancialHealth)
    mock_db_session.query(FinancialHealth).filter().first.return_value = mock_existing

    result = service.calculate_health_score(mock_db_session, target_date, force=False)
    assert result == mock_existing
    mock_db_session.query(FinancialStatistics).filter().filter().filter().first.assert_not_called()


@patch('backend.app.services.financial_health_service.FinancialHealthService._calculate_budget_adherence', return_value=(0,0))
@patch('backend.app.services.financial_health_service.FinancialHealthService._generate_recommendations', return_value=[])
def test_calculate_health_score_existing_with_force(
    mock_gen_recs, mock_calc_budget_adh, 
    mock_db_session, service
):
    target_date = date(2023, 3, 15)
    mock_existing = MagicMock(spec=FinancialHealth)
    mock_db_session.query(FinancialHealth).filter().first.return_value = mock_existing
    
    mock_monthly_stats = MagicMock(spec=FinancialStatistics, savings_rate=0, period_income=1, period_expenses=0)
    mock_db_session.query(FinancialStatistics).filter().filter().filter().first.return_value = mock_monthly_stats

    with patch('backend.app.services.financial_health_service.FinancialHealthService._calculate_debt_to_income', return_value=(0,0)), \
         patch('backend.app.services.financial_health_service.FinancialHealthService._calculate_emergency_fund', return_value=(0,0)), \
         patch('backend.app.services.financial_health_service.FinancialHealthService._calculate_spending_stability', return_value=(0,0)), \
         patch('backend.app.services.financial_health_service.FinancialHealthService._calculate_investment_rate', return_value=(0,0)):

        health_score_obj = service.calculate_health_score(mock_db_session, target_date, force=True)

    mock_db_session.delete.assert_called_once_with(mock_existing)
    mock_db_session.flush.assert_called_once() 
    
    mock_db_session.query(FinancialRecommendation).filter().delete.assert_called_once()
    
    assert health_score_obj is not None
    assert health_score_obj != mock_existing 
    mock_db_session.add.assert_called() 
    mock_db_session.commit.assert_called()

# --- Tests for _calculate_budget_adherence ---

@patch('backend.app.models.transaction.ExpenseCategory', autospec=True) 
def test_calculate_budget_adherence_good_adherence(MockExpenseCategory, mock_db_session, service):
    target_date = date(2023, 4, 15)
    MockExpenseCategory.FOOD.value = "Food & Drinks" 
    MockExpenseCategory.TRANSPORT.value = "Transport"

    mock_expense_tx1 = MagicMock(spec=Transaction)
    mock_expense_tx1.expense_category = MagicMock() 
    mock_expense_tx1.expense_category.value = "Food & Drinks" 
    mock_expense_tx1.amount = -100
    
    mock_expense_tx2 = MagicMock(spec=Transaction)
    mock_expense_tx2.expense_category = MagicMock()
    mock_expense_tx2.expense_category.value = "Transport"
    mock_expense_tx2.amount = -50
    
    mock_db_session.query(Transaction).filter().all.return_value = [mock_expense_tx1, mock_expense_tx2]

    mock_cat_stat_food_avg = [
        MagicMock(spec=CategoryStatistics, category_name="Food & Drinks", period_amount=110),
        MagicMock(spec=CategoryStatistics, category_name="Food & Drinks", period_amount=100),
        MagicMock(spec=CategoryStatistics, category_name="Food & Drinks", period_amount=90)
    ]
    mock_cat_stat_transport_avg = [
        MagicMock(spec=CategoryStatistics, category_name="Transport", period_amount=55),
        MagicMock(spec=CategoryStatistics, category_name="Transport", period_amount=50),
        MagicMock(spec=CategoryStatistics, category_name="Transport", period_amount=45)
    ]
    mock_db_session.query(CategoryStatistics).filter().all.return_value = mock_cat_stat_food_avg + mock_cat_stat_transport_avg
    
    score, adherence = service._calculate_budget_adherence(mock_db_session, target_date)

    assert adherence == pytest.approx(1.0)
    expected_score = service._score_component(1.0, FinancialHealthService.THRESHOLDS["budget_adherence"], True)
    assert score == expected_score 
    assert score == 100.0

@patch('backend.app.models.transaction.ExpenseCategory', autospec=True)
def test_calculate_budget_adherence_poor_adherence(MockExpenseCategory, mock_db_session, service):
    target_date = date(2023, 4, 15)
    MockExpenseCategory.FOOD.value = "Food & Drinks"
    MockExpenseCategory.TRANSPORT.value = "Transport"

    mock_expense_tx1 = MagicMock(spec=Transaction)
    mock_expense_tx1.expense_category = MagicMock(); mock_expense_tx1.expense_category.value = "Food & Drinks"
    mock_expense_tx1.amount = -200 
    mock_expense_tx2 = MagicMock(spec=Transaction)
    mock_expense_tx2.expense_category = MagicMock(); mock_expense_tx2.expense_category.value = "Transport"
    mock_expense_tx2.amount = -10 
    mock_db_session.query(Transaction).filter().all.return_value = [mock_expense_tx1, mock_expense_tx2]

    mock_cat_stat_food_avg = [MagicMock(spec=CategoryStatistics, category_name="Food & Drinks", period_amount=avg) for avg in [110,100,90]]
    mock_cat_stat_transport_avg = [MagicMock(spec=CategoryStatistics, category_name="Transport", period_amount=avg) for avg in [55,50,45]]
    mock_db_session.query(CategoryStatistics).filter().all.return_value = mock_cat_stat_food_avg + mock_cat_stat_transport_avg
    
    score, adherence = service._calculate_budget_adherence(mock_db_session, target_date)

    assert adherence == pytest.approx(0.1)
    expected_score = service._score_component(0.1, FinancialHealthService.THRESHOLDS["budget_adherence"], True)
    assert score == expected_score
    assert score < 20

def test_calculate_budget_adherence_no_current_expenses(mock_db_session, service):
    target_date = date(2023, 4, 15)
    mock_db_session.query(Transaction).filter().all.return_value = [] 
    score, adherence = service._calculate_budget_adherence(mock_db_session, target_date)
    assert score == 50.0 and adherence == 0.5

@patch('backend.app.models.transaction.ExpenseCategory', autospec=True)
def test_calculate_budget_adherence_no_historical_stats(MockExpenseCategory, mock_db_session, service):
    target_date = date(2023, 4, 15)
    MockExpenseCategory.FOOD.value = "Food & Drinks"
    mock_expense_tx1 = MagicMock(spec=Transaction)
    mock_expense_tx1.expense_category = MagicMock(); mock_expense_tx1.expense_category.value = "Food & Drinks"
    mock_expense_tx1.amount = -100
    mock_db_session.query(Transaction).filter().all.return_value = [mock_expense_tx1] 
    mock_db_session.query(CategoryStatistics).filter().all.return_value = [] 
    
    score, adherence = service._calculate_budget_adherence(mock_db_session, target_date)
    assert adherence == pytest.approx(1.0) 
    assert service._score_component(1.0, FinancialHealthService.THRESHOLDS["budget_adherence"], True) == 100.0


# --- Tests for _calculate_emergency_fund ---

@patch('backend.app.models.transaction.ExpenseCategory.get_essential_categories')
def test_calculate_emergency_fund_good_fund(mock_get_essential_cats_method, mock_db_session, service):
    target_date = date(2023, 6, 15)
    mock_get_essential_cats_method.return_value = ["Food & Drinks", "Rent"] 

    monthly_dates = [date(2023, 3, 31), date(2023, 4, 30), date(2023, 5, 31)]
    mock_db_session.query(FinancialStatistics.date).filter().all.return_value = [(d,) for d in monthly_dates]

    def mock_cat_stats_scalar(query_expr): 
        return 500 
    mock_db_session.query(CategoryStatistics.period_amount).filter().scalar.side_effect = mock_cat_stats_scalar
    
    mock_total_savings = MagicMock(spec=FinancialStatistics, total_net_savings=6000)
    mock_db_session.query(FinancialStatistics).filter(FinancialStatistics.period == StatisticsPeriod.ALL_TIME).first.return_value = mock_total_savings
    
    score, months_coverage = service._calculate_emergency_fund(mock_db_session, target_date)
    
    assert months_coverage == pytest.approx(6.0)
    expected_score = service._score_component(6.0, FinancialHealthService.THRESHOLDS["emergency_fund"], True)
    assert score == expected_score 

@patch('backend.app.models.transaction.ExpenseCategory.get_essential_categories')
def test_calculate_emergency_fund_no_savings(mock_get_essential_cats_method, mock_db_session, service):
    target_date = date(2023, 6, 15)
    mock_get_essential_cats_method.return_value = ["Food & Drinks"]
    mock_db_session.query(FinancialStatistics.date).filter().all.return_value = [(date(2023, 5, 31),)]
    mock_db_session.query(CategoryStatistics.period_amount).filter().scalar.return_value = 1000 

    mock_total_savings = MagicMock(spec=FinancialStatistics, total_net_savings=0) 
    mock_db_session.query(FinancialStatistics).filter(FinancialStatistics.period == StatisticsPeriod.ALL_TIME).first.return_value = mock_total_savings

    score, months_coverage = service._calculate_emergency_fund(mock_db_session, target_date)
    assert months_coverage == 0
    assert score == 0.0

@patch('backend.app.models.transaction.ExpenseCategory.get_essential_categories')
def test_calculate_emergency_fund_no_essential_expenses(mock_get_essential_cats_method, mock_db_session, service):
    target_date = date(2023, 6, 15)
    mock_get_essential_cats_method.return_value = ["Food & Drinks"]
    mock_db_session.query(FinancialStatistics.date).filter().all.return_value = [(date(2023, 5, 31),)]
    mock_db_session.query(CategoryStatistics.period_amount).filter().scalar.return_value = 0 

    mock_total_savings = MagicMock(spec=FinancialStatistics, total_net_savings=1000) 
    mock_db_session.query(FinancialStatistics).filter(FinancialStatistics.period == StatisticsPeriod.ALL_TIME).first.return_value = mock_total_savings # Corrected FinancialHealthService to FinancialStatistics

    score, months_coverage = service._calculate_emergency_fund(mock_db_session, target_date)
    assert months_coverage == 0
    assert score == 0.0

# --- Test for initialize_financial_health ---
@patch('backend.app.services.financial_health_service.FinancialHealthService.calculate_health_score')
def test_initialize_financial_health(mock_calculate_health_score, mock_db_session, service):
    mock_db_session.query().distinct().all.return_value = [
        (2023, 1), (2023, 2), (2023, 3)
    ]
    
    service.initialize_financial_health(mock_db_session)
    
    mock_db_session.execute.assert_any_call(text("BEGIN")) 
    mock_db_session.query(FinancialHealth).delete.assert_called_once()
    mock_db_session.flush.assert_called_once()
    
    assert mock_calculate_health_score.call_count == 3
    expected_calls = [
        call(mock_db_session, date(2023, 1, 31), force=True),
        call(mock_db_session, date(2023, 2, 28), force=True),
        call(mock_db_session, date(2023, 3, 31), force=True),
    ]
    mock_calculate_health_score.assert_has_calls(expected_calls, any_order=False)
    
    mock_db_session.commit.assert_called_once()

def test_initialize_financial_health_no_transactions(mock_db_session, service):
    mock_db_session.query().distinct().all.return_value = [] 
    
    service.initialize_financial_health(mock_db_session)
    
    mock_db_session.query(FinancialHealth).delete.assert_called_once()
    
    # Check if calculate_health_score was called using its original path
    # This requires that the object FinancialHealthService.calculate_health_score is patched,
    # not an instance of the service. Since it's a static method, this should work.
    # We need to ensure the patch is active for this check.
    with patch.object(FinancialHealthService, 'calculate_health_score') as mock_calc_direct:
        # Re-run the call that might trigger it, if it wasn't for the empty data
        # In this case, it shouldn't be called because months is empty.
        # The assertion is that it's NOT called.
        service.initialize_financial_health(mock_db_session) # Call again inside patch context if needed
        mock_calc_direct.assert_not_called()
    
    mock_db_session.commit.assert_called_once() 

# --- Test for get_health_history ---
def test_get_health_history(mock_db_session, service):
    mock_transaction = MagicMock(spec=Transaction)
    mock_transaction.transaction_date = date(2023, 3, 15)
    mock_db_session.query(Transaction).order_by().first.return_value = mock_transaction

    mock_score1 = MagicMock(spec=FinancialHealth, date=date(2023,1,31), overall_score=60, savings_rate_score=60, expense_ratio_score=60, budget_adherence_score=60, debt_to_income_score=60, emergency_fund_score=60, spending_stability_score=60, investment_rate_score=60)
    mock_score2 = MagicMock(spec=FinancialHealth, date=date(2023,2,28), overall_score=70, savings_rate_score=70, expense_ratio_score=70, budget_adherence_score=70, debt_to_income_score=70, emergency_fund_score=70, spending_stability_score=70, investment_rate_score=70)
    
    mock_db_session.query(FinancialHealth).filter().order_by().all.return_value = [mock_score1, mock_score2]
    
    history = service.get_health_history(mock_db_session, months=3) 
    
    assert len(history["dates"]) == 2
    assert history["dates"] == [date(2023,1,31), date(2023,2,28)]
    assert history["overall_scores"] == [60, 70]
