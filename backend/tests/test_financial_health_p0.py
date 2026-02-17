"""
Regression tests for P0 financial health fixes:
- GET /score is read-only (returns 404 when no score exists)
- POST /recalculate creates score atomically (score + recommendations in one transaction)
- Unique constraint prevents duplicate scores per month
- Force recalculation replaces old score cleanly

Uses an in-memory SQLite DB via conftest.py — never touches production data.
"""
from datetime import date
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db
from app.models.transaction import Transaction, TransactionType, ExpenseCategory
from app.models.statistics import FinancialStatistics, StatisticsPeriod

client = TestClient(app)


def _seed_transaction_and_stats(target_date: date = date(2025, 1, 15)):
    """Insert a transaction and monthly statistics directly into the test DB."""
    db = next(app.dependency_overrides[get_db]())
    try:
        tx = Transaction(
            account_number='BE1234567890',
            transaction_date=target_date,
            amount=-50.0,
            currency='EUR',
            description='Test expense',
            transaction_type=TransactionType.EXPENSE,
            expense_category=ExpenseCategory.GROCERIES,
            source_bank='TEST',
        )
        db.add(tx)

        stats = FinancialStatistics(
            date=target_date,
            period=StatisticsPeriod.MONTHLY,
            period_income=2000.0,
            period_expenses=50.0,
            period_net_savings=1950.0,
            savings_rate=97.5,
            total_income=2000.0,
            total_expenses=50.0,
            total_net_savings=1950.0,
        )
        db.add(stats)
        db.commit()
    finally:
        db.close()


# ── Test: GET /score is read-only ────────────────────────────────────

def test_get_score_returns_404_when_no_score_exists():
    """GET /score should NOT create a score; it should return 404 if none exists."""
    _seed_transaction_and_stats()

    # GET /score should return 404 (read-only, no side-effect)
    resp = client.get('/financial-health/score', params={'target_date': '2025-01-15'})
    assert resp.status_code == 404


# ── Test: POST /recalculate creates score ────────────────────────────

def test_recalculate_creates_score():
    """POST /recalculate should compute and persist a health score."""
    _seed_transaction_and_stats()

    resp = client.post('/financial-health/recalculate', params={'target_date': '2025-01-15'})
    assert resp.status_code == 200
    data = resp.json()
    assert 'overall_score' in data
    assert 'score_year' in data
    assert 'score_month' in data
    assert data['score_year'] == 2025
    assert data['score_month'] == 1

    # Now GET /score should return the computed score
    resp = client.get('/financial-health/score', params={'target_date': '2025-01-15'})
    assert resp.status_code == 200
    assert resp.json()['id'] == data['id']


# ── Test: Unique constraint prevents duplicates ──────────────────────

def test_recalculate_twice_does_not_duplicate():
    """Calling recalculate twice for the same month should replace, not duplicate."""
    _seed_transaction_and_stats()

    # First recalculation
    resp1 = client.post('/financial-health/recalculate', params={'target_date': '2025-01-15'})
    assert resp1.status_code == 200

    # Second recalculation (force=True internally)
    resp2 = client.post('/financial-health/recalculate', params={'target_date': '2025-01-15'})
    assert resp2.status_code == 200

    # History should show only one entry for January 2025 (no duplicates)
    resp = client.get('/financial-health/history', params={'months': 12})
    assert resp.status_code == 200
    history = resp.json()
    jan_count = sum(1 for d in history['dates'] if d.startswith('2025-01'))
    assert jan_count == 1


# ── Test: Atomic score + recommendations ─────────────────────────────

def test_recalculate_creates_recommendations_atomically():
    """Score and recommendations should be created in a single transaction."""
    _seed_transaction_and_stats()

    resp = client.post('/financial-health/recalculate', params={'target_date': '2025-01-15'})
    assert resp.status_code == 200
    score_data = resp.json()

    # The score should exist
    resp = client.get('/financial-health/score', params={'target_date': '2025-01-15'})
    assert resp.status_code == 200

    # Recommendations should also exist (created in the same transaction)
    resp = client.get('/financial-health/recommendations', params={'active_only': False})
    assert resp.status_code == 200
    recs = resp.json()
    json_recs = score_data.get('recommendations') or []
    assert len(recs) == len(json_recs)


# ── Test: Force recalculate cleans old recommendations ───────────────

def test_force_recalculate_replaces_recommendations():
    """Force recalculation should delete old recommendations before creating new ones."""
    _seed_transaction_and_stats()

    # First recalculation
    resp = client.post('/financial-health/recalculate', params={'target_date': '2025-01-15'})
    assert resp.status_code == 200
    resp = client.get('/financial-health/recommendations', params={'active_only': False})
    recs_before = resp.json()

    # Second recalculation (force)
    resp = client.post('/financial-health/recalculate', params={'target_date': '2025-01-15'})
    assert resp.status_code == 200
    resp = client.get('/financial-health/recommendations', params={'active_only': False})
    recs_after = resp.json()

    # Should have the same number of recommendations (replaced, not doubled)
    assert len(recs_after) == len(recs_before)
