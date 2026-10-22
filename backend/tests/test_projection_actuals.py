"""
Tests for the actual net worth history plotted alongside projections:
holdings value snapshots (recorded on global update) combined with the
cumulative net savings from monthly statistics.

Uses the in-memory SQLite DB from conftest.py — never touches production data.
"""
from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db
from app.models.financial_projection import HoldingsValueHistory
from app.models.statistics import FinancialStatistics, StatisticsPeriod
from app.services.holdings_history_service import HoldingsHistoryService
from app.services.projection_service import ProjectionService

client = TestClient(app)

# Month-end dates for 2025-11 .. 2026-09 (11 months) with cumulative savings 1000, 2000, ...
MONTH_ENDS = [
    date(2025, 11, 30), date(2025, 12, 31), date(2026, 1, 31), date(2026, 2, 28),
    date(2026, 3, 31), date(2026, 4, 30), date(2026, 5, 31), date(2026, 6, 30),
    date(2026, 7, 31), date(2026, 8, 31), date(2026, 9, 30),
]


def _session():
    return next(app.dependency_overrides[get_db]())


@pytest.fixture(autouse=True)
def _seed_statistics():
    ProjectionService.invalidate_historical_data_cache()
    db = _session()
    try:
        for i, month_end in enumerate(MONTH_ENDS):
            db.add(FinancialStatistics(
                period=StatisticsPeriod.MONTHLY, date=month_end,
                period_income=3000, period_expenses=2000, period_net_savings=1000,
                total_net_savings=1000 * (i + 1),
            ))
        db.add(FinancialStatistics(period=StatisticsPeriod.ALL_TIME, date=None, total_net_savings=11000))
        db.commit()
    finally:
        db.close()
    yield
    ProjectionService.invalidate_historical_data_cache()


def _holdings_rows():
    db = _session()
    try:
        return [(h.year, h.month, h.value) for h in db.query(HoldingsValueHistory).order_by(
            HoldingsValueHistory.year, HoldingsValueHistory.month).all()]
    finally:
        db.close()


def _base_scenario_id() -> int:
    scenarios = client.get("/projections/scenarios").json()
    return next(s["id"] for s in scenarios if s["name"] == "Base Case")


def test_record_value_upserts_per_month():
    db = _session()
    try:
        HoldingsHistoryService.record_value(db, 100.0, date(2026, 9, 1))
        db.commit()
        HoldingsHistoryService.record_value(db, 250.0, date(2026, 9, 15))
        db.commit()
    finally:
        db.close()
    assert _holdings_rows() == [(2026, 9, 250.0)]


def test_reference_month_is_latest_statistics_month():
    db = _session()
    try:
        assert HoldingsHistoryService.get_reference_month(db) == date(2026, 9, 1)
    finally:
        db.close()


def test_global_holdings_update_records_history():
    _base_scenario_id()  # creates default scenarios
    response = client.put("/projections/scenarios/holdings-market-value", json={"value": 50000})
    assert response.status_code == 200
    assert _holdings_rows() == [(2026, 9, 50000.0)]


def test_results_include_actual_net_worth_history():
    scenario_id = _base_scenario_id()
    db = _session()
    try:
        # Holdings known only for the last three months; earlier months must be omitted (None)
        for month, value in [(7, 40000.0), (8, 41000.0), (9, 42000.0)]:
            HoldingsHistoryService.record_value(db, value, date(2026, month, 1))
        db.commit()
    finally:
        db.close()

    assert client.post(f"/projections/scenarios/{scenario_id}/calculate").status_code == 200
    data = client.get(f"/projections/scenarios/{scenario_id}/results").json()

    assert data["dates"][0] == "2026-10"
    assert len(data["historical_dates"]) == ProjectionService.ACTUAL_HISTORY_MONTHS
    assert data["historical_dates"][0] == "2025-10"
    assert data["historical_dates"][-1] == "2026-09"

    actual = data["actual_net_worth"]
    assert actual[:9] == [None] * 9
    assert actual[9:] == [9000 + 40000.0, 10000 + 41000.0, 11000 + 42000.0]

    real = data["real_actual_net_worth"]
    assert real[:9] == [None] * 9
    # Latest actual month is the real-value baseline; older months are inflated to today's money
    assert real[-1] == actual[-1]
    assert real[-2] > actual[-2]


def test_results_without_holdings_history_have_no_actuals():
    scenario_id = _base_scenario_id()
    client.post(f"/projections/scenarios/{scenario_id}/calculate")
    data = client.get(f"/projections/scenarios/{scenario_id}/results").json()
    assert all(v is None for v in data["actual_net_worth"])
    assert all(v is None for v in data["real_actual_net_worth"])


def test_comparison_includes_shared_actual_net_worth_history():
    scenarios = client.get("/projections/scenarios").json()
    ids = [s["id"] for s in scenarios[:2]]
    db = _session()
    try:
        HoldingsHistoryService.record_value(db, 42000.0, date(2026, 9, 1))
        db.commit()
    finally:
        db.close()

    response = client.post("/projections/scenarios/compare", json=ids)
    assert response.status_code == 200
    data = response.json()

    assert data["dates"][0] == "2026-10"
    assert data["historical_dates"][-1] == "2026-09"
    assert data["actual_net_worth"][-1] == 11000 + 42000.0
    assert data["actual_net_worth"][:-1] == [None] * (ProjectionService.ACTUAL_HISTORY_MONTHS - 1)
    assert data["real_actual_net_worth"][-1] == data["actual_net_worth"][-1]
