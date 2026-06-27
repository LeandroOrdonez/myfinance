"""
Tests for the Budgets feature: CRUD, validation, monthly progress tracking
(with threshold boundaries and divide-by-zero safety), and percentile-based
limit suggestions.

Uses the in-memory SQLite DB from conftest.py — never touches production data.
"""
from datetime import date
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db
from app.models.budget import Budget
from app.models.transaction import Transaction, TransactionType, ExpenseCategory, IncomeCategory

client = TestClient(app)


def _seed_transaction(
    target_date: date,
    amount: float,
    transaction_type: TransactionType = TransactionType.EXPENSE,
    expense_category: ExpenseCategory = ExpenseCategory.GROCERIES,
    income_category: IncomeCategory = None,
):
    """Insert a single transaction directly into the test DB."""
    db = next(app.dependency_overrides[get_db]())
    try:
        tx = Transaction(
            account_number='BE1234567890',
            transaction_date=target_date,
            amount=amount,
            currency='EUR',
            description='Test transaction',
            transaction_type=transaction_type,
            expense_category=expense_category,
            income_category=income_category,
            source_bank='TEST',
        )
        db.add(tx)
        db.commit()
    finally:
        db.close()


def _insert_budget_directly(category: str, limit_amount: float, is_active: bool = True):
    """Insert a budget directly (bypassing schema validation) for edge-case tests."""
    db = next(app.dependency_overrides[get_db]())
    try:
        budget = Budget(category=category, limit_amount=limit_amount, period="monthly", is_active=is_active)
        db.add(budget)
        db.commit()
        db.refresh(budget)
        return budget.id
    finally:
        db.close()


# ── CRUD ─────────────────────────────────────────────────────────────

def test_create_and_list_budget():
    resp = client.post('/budgets/', json={'category': 'Groceries', 'limit_amount': 500.0})
    assert resp.status_code == 201
    body = resp.json()
    assert body['category'] == 'Groceries'
    assert body['limit_amount'] == 500.0
    assert body['is_active'] is True

    resp = client.get('/budgets/')
    assert resp.status_code == 200
    budgets = resp.json()
    assert len(budgets) == 1
    assert budgets[0]['category'] == 'Groceries'


def test_duplicate_category_rejected():
    client.post('/budgets/', json={'category': 'Groceries', 'limit_amount': 500.0})
    resp = client.post('/budgets/', json={'category': 'Groceries', 'limit_amount': 600.0})
    assert resp.status_code == 409


def test_update_budget_limit():
    created = client.post('/budgets/', json={'category': 'Groceries', 'limit_amount': 500.0}).json()
    resp = client.put(f"/budgets/{created['id']}", json={'limit_amount': 750.0})
    assert resp.status_code == 200
    assert resp.json()['limit_amount'] == 750.0


def test_delete_budget():
    created = client.post('/budgets/', json={'category': 'Groceries', 'limit_amount': 500.0}).json()
    resp = client.delete(f"/budgets/{created['id']}")
    assert resp.status_code == 200
    assert client.get('/budgets/').json() == []


def test_update_missing_budget_returns_404():
    resp = client.put('/budgets/9999', json={'limit_amount': 100.0})
    assert resp.status_code == 404


def test_delete_missing_budget_returns_404():
    resp = client.delete('/budgets/9999')
    assert resp.status_code == 404


# ── Validation ───────────────────────────────────────────────────────

def test_invalid_category_rejected():
    resp = client.post('/budgets/', json={'category': 'NotACategory', 'limit_amount': 500.0})
    assert resp.status_code in (400, 422)


def test_non_positive_limit_rejected():
    resp = client.post('/budgets/', json={'category': 'Groceries', 'limit_amount': 0})
    assert resp.status_code in (400, 422)


# ── Progress ─────────────────────────────────────────────────────────

def test_progress_on_track():
    client.post('/budgets/', json={'category': 'Groceries', 'limit_amount': 100.0})
    _seed_transaction(date(2025, 3, 10), -50.0)  # 50% spent

    resp = client.get('/budgets/progress', params={'target_date': '2025-03-31'})
    assert resp.status_code == 200
    progress = resp.json()[0]
    assert progress['spent'] == 50.0
    assert progress['remaining'] == 50.0
    assert progress['percentage'] == 50.0
    assert progress['status'] == 'on_track'
    assert progress['month'] == '2025-03'


def test_progress_warning_at_80_percent_boundary():
    client.post('/budgets/', json={'category': 'Groceries', 'limit_amount': 100.0})
    _seed_transaction(date(2025, 3, 10), -80.0)  # exactly 80%

    progress = client.get('/budgets/progress', params={'target_date': '2025-03-31'}).json()[0]
    assert progress['percentage'] == 80.0
    assert progress['status'] == 'warning'


def test_progress_over_at_100_percent_boundary():
    client.post('/budgets/', json={'category': 'Groceries', 'limit_amount': 100.0})
    _seed_transaction(date(2025, 3, 10), -100.0)  # exactly 100%

    progress = client.get('/budgets/progress', params={'target_date': '2025-03-31'}).json()[0]
    assert progress['percentage'] == 100.0
    assert progress['status'] == 'over'
    assert progress['remaining'] == 0.0


def test_progress_over_budget():
    client.post('/budgets/', json={'category': 'Groceries', 'limit_amount': 100.0})
    _seed_transaction(date(2025, 3, 10), -150.0)

    progress = client.get('/budgets/progress', params={'target_date': '2025-03-31'}).json()[0]
    assert progress['percentage'] == 150.0
    assert progress['status'] == 'over'
    assert progress['remaining'] == -50.0


def test_progress_divide_by_zero_safe():
    # Insert a zero-limit budget directly (schema normally prevents this).
    _insert_budget_directly('Groceries', 0.0)
    _seed_transaction(date(2025, 3, 10), -25.0)

    progress = client.get('/budgets/progress', params={'target_date': '2025-03-31'}).json()[0]
    assert progress['percentage'] == 100.0
    assert progress['status'] == 'over'
    assert progress['remaining'] == -25.0


# ── Isolation ────────────────────────────────────────────────────────

def test_income_and_transfer_excluded_from_spent():
    client.post('/budgets/', json={'category': 'Groceries', 'limit_amount': 100.0})
    _seed_transaction(date(2025, 3, 10), -40.0)  # expense counts
    _seed_transaction(date(2025, 3, 11), 1000.0, transaction_type=TransactionType.INCOME,
                      expense_category=None, income_category=IncomeCategory.SALARY)
    _seed_transaction(date(2025, 3, 12), -500.0, transaction_type=TransactionType.TRANSFER,
                      expense_category=ExpenseCategory.GROCERIES)

    progress = client.get('/budgets/progress', params={'target_date': '2025-03-31'}).json()[0]
    assert progress['spent'] == 40.0


def test_other_category_does_not_bleed():
    client.post('/budgets/', json={'category': 'Groceries', 'limit_amount': 100.0})
    _seed_transaction(date(2025, 3, 10), -40.0, expense_category=ExpenseCategory.GROCERIES)
    _seed_transaction(date(2025, 3, 11), -90.0, expense_category=ExpenseCategory.SHOPPING)

    progress = client.get('/budgets/progress', params={'target_date': '2025-03-31'}).json()[0]
    assert progress['spent'] == 40.0


# ── Suggestion ───────────────────────────────────────────────────────

def test_suggestion_percentile():
    # Seed 6 trailing months ending at 2025-06: 100..600.
    for i, amount in enumerate([100, 200, 300, 400, 500, 600], start=1):
        _seed_transaction(date(2025, i, 15), -float(amount))

    resp = client.get('/budgets/suggestion', params={
        'category': 'Groceries', 'percentile': 75, 'months': 6,
    })
    assert resp.status_code == 200
    body = resp.json()
    # pandas linear interpolation: quantile(0.75) of [100..600] = 475.0
    assert body['suggested_limit'] == 475.0
    assert body['months_analyzed'] == 6
    assert body['monthly_history'] == [100.0, 200.0, 300.0, 400.0, 500.0, 600.0]
    assert body['percentile'] == 75.0


def test_suggestion_empty_history():
    resp = client.get('/budgets/suggestion', params={'category': 'Groceries'})
    assert resp.status_code == 200
    body = resp.json()
    assert body['suggested_limit'] == 0.0
    assert body['months_analyzed'] == 0
    assert body['monthly_history'] == []


def test_suggestion_invalid_category():
    resp = client.get('/budgets/suggestion', params={'category': 'NotReal'})
    assert resp.status_code == 400
