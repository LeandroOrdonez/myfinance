from datetime import date

import pytest

from app.main import app
from app.database import get_db
from app.models.financial_projection import ProjectionScenario, ProjectionParameter, ProjectionResult
from app.models.statistics import FinancialStatistics, StatisticsPeriod
from app.services.projection_service import ProjectionService


@pytest.fixture
def forecast(monkeypatch):
    db = next(app.dependency_overrides[get_db]())
    history = dict(latest_date=date(2026, 1, 31), avg_monthly_income=1000,
                   avg_monthly_expenses=400, essential_expense_ratio=1,
                   discretionary_expense_ratio=0, avg_investment_rate=0.8,
                   avg_expense_to_income_ratio=0.4)
    monkeypatch.setattr(ProjectionService, 'analyze_historical_data', staticmethod(lambda *args, **kwargs: history))
    scenario = ProjectionScenario(name='Custom', description='Test', is_base_scenario=False)
    db.add(scenario)
    db.flush()
    for name, value in dict(income_growth_rate=0, essential_expenses_growth_rate=0,
                            discretionary_expenses_growth_rate=0, investment_rate=0.2,
                            investment_return_rate=0, inflation_rate=0.12,
                            emergency_fund_target=0, holdings_market_value=1000).items():
        db.add(ProjectionParameter(scenario_id=scenario.id, param_name=name, param_value=value, param_type='percentage'))
    db.add(FinancialStatistics(period=StatisticsPeriod.ALL_TIME, total_net_savings=500))
    db.commit()
    yield db, scenario, history
    db.close()


def set_parameter(db, scenario, name, value):
    db.query(ProjectionParameter).filter_by(scenario_id=scenario.id, param_name=name).one().param_value = value
    db.commit()


def test_custom_allocation_and_zero_are_honored(forecast):
    db, scenario, _ = forecast
    results = ProjectionService.calculate_projection(db, scenario.id, 12)
    assert results[0].projected_investments == pytest.approx(200)
    assert results[0].projected_savings == pytest.approx(400)
    assert results[0].projected_net_worth == pytest.approx(2100)
    set_parameter(db, scenario, 'investment_rate', 0)
    assert ProjectionService.calculate_projection(db, scenario.id, 12)[0].projected_investments == 0


def test_returns_compound_without_double_counting_contributions(forecast):
    db, scenario, _ = forecast
    set_parameter(db, scenario, 'investment_return_rate', 0.12)
    results = ProjectionService.calculate_projection(db, scenario.id, 12)
    rate = 1.12 ** (1 / 12) - 1
    portfolio, cash = 1000, 500
    for result in results:
        portfolio = portfolio * (1 + rate) + 200
        cash += 400
        assert result.projected_net_worth == pytest.approx(portfolio + cash)


def test_spending_is_not_silently_capped_and_investments_are_affordable(forecast):
    db, scenario, history = forecast
    history['avg_monthly_expenses'] = 1200
    first = ProjectionService.calculate_projection(db, scenario.id, 12)[0]
    assert first.projected_expenses == 1200
    assert first.projected_savings == -200
    assert first.projected_investments == 0
    assert first.projected_net_worth == 1300


def test_emergency_target_preserves_cash_before_investing(forecast):
    db, scenario, _ = forecast
    set_parameter(db, scenario, 'emergency_fund_target', 3)
    results = ProjectionService.calculate_projection(db, scenario.id, 12)
    assert results[0].projected_investments == 0
    assert results[1].projected_investments == 200
    assert results[0].projected_savings == 600


def test_calculation_does_not_implicitly_overwrite_base_assumptions(forecast, monkeypatch):
    db, scenario, _ = forecast
    scenario.is_base_scenario = True
    db.commit()
    monkeypatch.setattr(ProjectionService, 'recompute_base_case_parameters', lambda *args: pytest.fail('Unexpected refresh'))
    ProjectionService.calculate_projection(db, scenario.id, 12)


def test_provenance_survives_reload_and_uses_saved_inflation(forecast):
    db, scenario, _ = forecast
    ProjectionService.calculate_projection(db, scenario.id, 12)
    original = ProjectionService.get_projection_results(db, scenario.id)
    assert original['provenance']['status'] == 'current'
    assert original['provenance']['calculated_at']
    set_parameter(db, scenario, 'inflation_rate', 0)
    db.expire_all()
    stale = ProjectionService.get_projection_results(db, scenario.id)
    assert stale['provenance']['status'] == 'out_of_date'
    assert stale['inflation_rate'] == 0.12
    assert stale['real_projected_net_worth'] == original['real_projected_net_worth']


def test_source_edits_invalidate_provenance(forecast):
    db, scenario, _ = forecast
    ProjectionService.calculate_projection(db, scenario.id, 12)
    db.query(FinancialStatistics).one().total_net_savings += 1
    db.commit()
    assert ProjectionService.get_projection_results(db, scenario.id)['provenance']['status'] == 'out_of_date'


def test_legacy_results_are_unverified(forecast):
    db, scenario, _ = forecast
    db.add(ProjectionResult(scenario_id=scenario.id, month=2, year=2026, projected_income=1000,
                            projected_expenses=400, projected_investments=200, projected_savings=400,
                            projected_net_worth=2100))
    db.commit()
    data = ProjectionService.get_projection_results(db, scenario.id)
    assert data['provenance']['status'] == 'unverified'
    assert data['inflation_rate'] is None
    assert data['real_projected_net_worth'] == []


def test_annual_growth_uses_medians_so_spike_months_do_not_compound(forecast):
    series = [100] * 12 + [100] * 11 + [10000]
    assert ProjectionService.calculate_annual_growth(series) == pytest.approx(0)
    growing = [100] * 12 + [120] * 12
    assert ProjectionService.calculate_annual_growth(growing) == pytest.approx(0.2)


def test_derived_expense_growth_is_capped_at_income_trend(forecast):
    derived = ProjectionService._derive_growth_parameters({
        'avg_annual_income_growth': 0.10,
        'avg_annual_essential_expense_growth': 0.50,
        'avg_annual_discretionary_expense_growth': 0.60,
        'avg_investment_rate': 0.20,
    })
    assert derived['essential_expenses_growth_rate'] == pytest.approx(0.10)
    assert derived['discretionary_expenses_growth_rate'] == pytest.approx(0.10)
    assert derived['income_growth_rate'] == pytest.approx(0.10)
    assert derived['investment_rate'] == pytest.approx(0.20)


def test_annual_growth_has_twelve_monthly_intervals(forecast):
    db, scenario, _ = forecast
    set_parameter(db, scenario, 'income_growth_rate', 0.12)
    assert ProjectionService.calculate_projection(db, scenario.id, 12)[-1].projected_income == pytest.approx(1120)


def test_negative_returns_and_partial_surplus_are_not_hidden(forecast):
    db, scenario, history = forecast
    history['avg_monthly_expenses'] = 950
    set_parameter(db, scenario, 'investment_return_rate', -0.5)
    first = ProjectionService.calculate_projection(db, scenario.id, 12)[0]
    assert first.projected_investments == 50
    assert first.projected_savings == 0
    assert first.projected_net_worth == pytest.approx(500 + 1000 * 0.5 ** (1 / 12) + 50)


def test_failed_calculation_rolls_back_results_and_provenance_together(forecast, monkeypatch):
    db, scenario, _ = forecast
    ProjectionService.calculate_projection(db, scenario.id, 12)
    original = ProjectionService.get_projection_results(db, scenario.id)
    set_parameter(db, scenario, 'investment_return_rate', 0.5)
    with monkeypatch.context() as patch:
        def fail_commit():
            raise RuntimeError('Test commit failure')
        patch.setattr(db, 'commit', fail_commit)
        with pytest.raises(RuntimeError):
            ProjectionService.calculate_projection(db, scenario.id, 12)
    saved = ProjectionService.get_projection_results(db, scenario.id)
    assert saved['projected_net_worth'] == original['projected_net_worth']
    assert saved['provenance']['calculated_at'] == original['provenance']['calculated_at']
    assert saved['provenance']['status'] == 'out_of_date'


def test_comparison_aligns_dates_and_disambiguates_duplicate_names(forecast):
    db, scenario, _ = forecast
    ProjectionService.calculate_projection(db, scenario.id, 12)
    second = ProjectionScenario(name=scenario.name, description='Another outlook')
    db.add(second)
    db.flush()
    db.add(ProjectionResult(scenario_id=second.id, month=5, year=2027, projected_income=1000,
                            projected_expenses=400, projected_investments=200, projected_savings=400,
                            projected_net_worth=3000))
    db.commit()
    comparison = ProjectionService.compare_scenarios(db, [scenario.id, second.id])
    labels = comparison['scenario_names']
    assert len(set(labels)) == 2
    assert comparison['dates'][-1] == '2027-05'
    assert comparison['net_worth_series'][labels[1]][0] is None
    assert comparison['net_worth_series'][labels[1]][-1] == 3000
    assert comparison['net_worth_series'][labels[0]][-1] is None
    assert comparison['real_actual_net_worth'] == []


def test_comparison_requires_explicit_calculation_and_preserves_404(forecast):
    from fastapi.testclient import TestClient
    db, scenario, _ = forecast
    client = TestClient(app)
    assert client.post('/projections/scenarios/compare', json=[scenario.id]).status_code == 409
    assert db.query(ProjectionResult).count() == 0
    assert client.get('/projections/scenarios/99999/results').status_code == 404
    assert client.post('/projections/scenarios/99999/calculate').status_code == 404
