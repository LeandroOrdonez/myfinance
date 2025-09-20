import io
import csv
from fastapi.testclient import TestClient

from app.main import app
from app.routers import transactions as tx_router

client = TestClient(app)


def _reset_rate_limiter():
    # Clear in-memory per-IP rate limiter to avoid test cross-talk
    try:
        tx_router._upload_attempts.clear()  # type: ignore[attr-defined]
    except Exception:
        pass


def _make_minimal_ing_csv(rows: int = 1) -> bytes:
    """Create a minimal valid ING CSV content with the expected headers and delimiter ';'."""
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
    for i in range(rows):
        writer.writerow([
            'BE1234567890',               # Account Number
            'Main Account',               # Account Name
            'BE0987654321',               # Counterparty account
            '01/01/2025',                 # Booking date (DD/MM/YYYY)
            '1.00',                       # Amount
            'EUR',                        # Currency
            f'Test row {i}',              # Description
        ])
    return output.getvalue().encode('utf-8')


def test_rejects_non_csv_extension():
    _reset_rate_limiter()
    files = {
        'file': ('not_csv.txt', b'not a csv', 'text/plain')
    }
    resp = client.post('/transactions/upload/', files=files)
    assert resp.status_code == 400
    assert 'Invalid file format' in resp.text


def test_rejects_unsupported_media_type_with_csv_extension():
    _reset_rate_limiter()
    files = {
        # Wrong content type on purpose
        'file': ('data.csv', _make_minimal_ing_csv(1), 'application/pdf')
    }
    resp = client.post('/transactions/upload/', files=files)
    assert resp.status_code == 415
    assert 'Unsupported media type' in resp.text


def test_rate_limit_per_ip():
    _reset_rate_limiter()
    files = {
        'file': ('data.csv', _make_minimal_ing_csv(1), 'text/csv')
    }
    # First three should pass guardrail (status may be 200 with [] or list)
    for _ in range(3):
        r = client.post('/transactions/upload/', files=files)
        assert r.status_code in (200, 207, 400, 415, 413)
    # Fourth within window should be rate-limited
    r = client.post('/transactions/upload/', files=files)
    assert r.status_code == 429


def test_row_cap_returns_400():
    _reset_rate_limiter()
    # 5001 rows to exceed MAX_ROWS_PER_UPLOAD = 5000
    csv_bytes = _make_minimal_ing_csv(rows=5001)
    files = {
        'file': ('big.csv', csv_bytes, 'text/csv')
    }
    resp = client.post('/transactions/upload/', files=files)
    assert resp.status_code == 400
    assert 'maximum allowed per upload' in resp.text
