import io
import csv
from fastapi.testclient import TestClient

from app.main import app
from app.routers import transactions as tx_router
from app.routers.suggestions import category_suggestion_service
from qdrant_client.http import models

client = TestClient(app)


def _reset_rate_limiter():
    # Clear in-memory per-IP rate limiter to avoid test cross-talk
    try:
        tx_router._upload_attempts.clear()  # type: ignore[attr-defined]
    except Exception:
        pass


def _reset_database():
    # Use the debug endpoint to reset the DB between tests
    resp = client.post('/debug/reset-database')
    assert resp.status_code == 200


def _clear_vector_collections():
    # Ensure vector DB is empty and deterministic for the test
    category_suggestion_service.client.recreate_collection(
        collection_name="expense_embeddings",
        vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE),
    )
    category_suggestion_service.client.recreate_collection(
        collection_name="income_embeddings",
        vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE),
    )


def _make_minimal_ing_csv_row(*, description: str, amount: str = "-10.00") -> bytes:
    """Create a minimal valid ING CSV content with one row.
    Use negative amount to mark it as EXPENSE.
    """
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    # Headers expected by detection and parsing
    writer.writerow([
        'Account Number',
        'Account Name',
        'Counterparty account',
        'Booking date',
        'Amount',
        'Currency',
        'Description',
    ])
    writer.writerow([
        'BE1234567890',               # Account Number
        'Main Account',               # Account Name
        'BE0987654321',               # Counterparty account
        '01/01/2025',                 # Booking date (DD/MM/YYYY)
        amount,                       # Amount (negative => expense)
        'EUR',                        # Currency
        description,                  # Description
    ])
    return output.getvalue().encode('utf-8')


def test_manual_category_edit_updates_suggestion_index():
    _reset_rate_limiter()
    _reset_database()
    _clear_vector_collections()

    # 1) Upload a single expense transaction (no initial category will be set)
    csv_bytes = _make_minimal_ing_csv_row(description="Test Coffee Shop", amount="-12.34")
    files = { 'file': ('data.csv', csv_bytes, 'text/csv') }
    resp = client.post('/transactions/upload/', files=files)
    assert resp.status_code == 200
    items = resp.json()
    # Expect exactly one new transaction
    assert isinstance(items, list)
    assert len(items) == 1
    tx = items[0]
    tx_id = tx['id']

    # 2) Manually update category to GROCERIES (expense)
    patch_url = f"/transactions/{tx_id}/category"
    resp = client.patch(patch_url, params={
        'category': 'Groceries',
        'transaction_type': 'Expense'
    })
    assert resp.status_code == 200
    updated = resp.json()
    assert updated['expense_category'] == 'Groceries'

    # 3) Verify the vector index contains this transaction under expense_embeddings
    retrieved = category_suggestion_service.client.retrieve(
        collection_name="expense_embeddings",
        ids=[tx_id]
    )
    # Should retrieve exactly one point with our payload category
    assert retrieved and len(retrieved) == 1
    point = retrieved[0]
    assert point.payload.get('category') == 'Groceries'
