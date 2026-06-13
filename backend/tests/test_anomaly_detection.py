"""
Comprehensive tests for anomaly detection functionality.

Tests cover:
- Statistical outlier detection (Z-score based)
- Amount anomaly detection (percentile based)
- Temporal anomaly detection (weekend spending patterns)
- Frequency anomaly detection (merchant transaction frequency)
- Behavioral anomaly detection (new category usage)
- Merchant anomaly detection (new merchant large amounts)
- Batch query optimization (precomputed statistics)
- Configuration-based thresholds
"""
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db
from app.models.transaction import Transaction, TransactionType, ExpenseCategory
from app.models.anomaly import (
    TransactionAnomaly, AnomalyType, AnomalyStatus, AnomalyConfig
)
from app.services.anomaly_detection_service import AnomalyDetectionService

client = TestClient(app)


def _seed_transactions_for_anomaly_detection(target_date: date = date(2025, 1, 15)):
    """Seed transactions for anomaly detection testing."""
    db = next(app.dependency_overrides[get_db]())
    try:
        # Create category baseline transactions (GROCERIES)
        for i in range(15):
            tx = Transaction(
                account_number='BE1234567890',
                transaction_date=target_date - timedelta(days=i*2),
                amount=-50.0,  # Normal grocery amount
                currency='EUR',
                description='Grocery shopping',
                counterparty_name='Supermarket',
                counterparty_account='BE9999999999',
                transaction_type=TransactionType.EXPENSE,
                expense_category=ExpenseCategory.GROCERIES,
                source_bank='TEST',
            )
            db.add(tx)

        # Create a statistical outlier (much larger than normal)
        outlier_tx = Transaction(
            account_number='BE1234567890',
            transaction_date=target_date,
            amount=-500.0,  # 10x normal amount
            currency='EUR',
            description='Unusual large grocery purchase',
            counterparty_name='Supermarket',
            counterparty_account='BE9999999999',
            transaction_type=TransactionType.EXPENSE,
            expense_category=ExpenseCategory.GROCERIES,
            source_bank='TEST',
        )
        db.add(outlier_tx)

        # Create amount anomaly (top percentile transaction)
        large_tx = Transaction(
            account_number='BE1234567890',
            transaction_date=target_date,
            amount=-2000.0,  # Very large amount
            currency='EUR',
            description='Major purchase',
            counterparty_name='Luxury Store',
            counterparty_account='BE8888888888',
            transaction_type=TransactionType.EXPENSE,
            expense_category=ExpenseCategory.ENTERTAINMENT,
            source_bank='TEST',
        )
        db.add(large_tx)

        # Create transactions for frequency testing (same merchant, many times)
        for i in range(12):
            freq_tx = Transaction(
                account_number='BE1234567890',
                transaction_date=target_date - timedelta(days=i*2),
                amount=-20.0,
                currency='EUR',
                description='Frequent merchant',
                counterparty_name='Coffee Shop',
                counterparty_account='BE7777777777',
                transaction_type=TransactionType.EXPENSE,
                expense_category=ExpenseCategory.EATING_OUT,
                source_bank='TEST',
            )
            db.add(freq_tx)

        # Create transaction with new category (first time using HEALTH)
        new_category_tx = Transaction(
            account_number='BE1234567890',
            transaction_date=target_date,
            amount=-100.0,
            currency='EUR',
            description='First healthcare expense',
            counterparty_name='Medical Center',
            counterparty_account='BE6666666666',
            transaction_type=TransactionType.EXPENSE,
            expense_category=ExpenseCategory.HEALTH,
            source_bank='TEST',
        )
        db.add(new_category_tx)

        # Create transaction with new merchant and large amount
        new_merchant_tx = Transaction(
            account_number='BE1234567890',
            transaction_date=target_date,
            amount=-300.0,  # Large amount for new merchant
            currency='EUR',
            description='First time at this merchant',
            counterparty_name='New Electronics Store',
            counterparty_account='BE5555555555',
            transaction_type=TransactionType.EXPENSE,
            expense_category=ExpenseCategory.SHOPPING,
            source_bank='TEST',
        )
        db.add(new_merchant_tx)

        # Create weekend essential spending (Sunday grocery shopping)
        weekend_tx = Transaction(
            account_number='BE1234567890',
            transaction_date=date(2025, 1, 12),  # Sunday
            amount=-150.0,
            currency='EUR',
            description='Weekend grocery run',
            counterparty_name='Supermarket',
            counterparty_account='BE9999999999',
            transaction_type=TransactionType.EXPENSE,
            expense_category=ExpenseCategory.GROCERIES,
            source_bank='TEST',
        )
        db.add(weekend_tx)

        db.commit()

        # Return the IDs for later verification
        return {
            'outlier_id': outlier_tx.id,
            'large_tx_id': large_tx.id,
            'freq_tx_id': freq_tx.id,
            'new_category_tx_id': new_category_tx.id,
            'new_merchant_tx_id': new_merchant_tx.id,
            'weekend_tx_id': weekend_tx.id,
        }
    finally:
        db.close()


def _get_db():
    """Get database session for tests."""
    return next(app.dependency_overrides[get_db]())


# ── Test: Configuration is created and accessible ────────────────────

def test_anomaly_config_created_on_first_access():
    """AnomalyConfig should be created with defaults on first access."""
    db = _get_db()
    try:
        # Clear any existing config
        db.query(AnomalyConfig).delete()
        db.commit()

        # Accessing config should create default
        config = AnomalyConfig.get_or_create_default(db)
        assert config is not None
        assert config.z_score_threshold == 2.0
        assert config.min_sample_size == 10
        assert config.high_percentile == 95.0
        assert config.max_merchant_frequency_30d == 10
    finally:
        db.close()


# ── Test: Statistical Outlier Detection ───────────────────────────────

def test_statistical_outlier_detection():
    """Z-score based outlier detection should flag unusually large transactions."""
    tx_ids = _seed_transactions_for_anomaly_detection()
    db = _get_db()
    try:
        # Run detection on the outlier transaction
        result = AnomalyDetectionService.detect_anomalies(
            db=db,
            transaction_ids=[tx_ids['outlier_id']],
            force_redetection=True
        )

        assert result['anomalies_detected'] > 0

        # Verify the anomaly was created
        anomaly = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.transaction_id == tx_ids['outlier_id']
        ).first()

        assert anomaly is not None
        assert anomaly.anomaly_type == AnomalyType.STATISTICAL_OUTLIER
        assert anomaly.anomaly_score > 50  # Should be significant
    finally:
        db.close()


# ── Test: Amount Anomaly Detection ────────────────────────────────────

def test_amount_anomaly_detection():
    """Percentile-based detection should flag top percentile transactions."""
    tx_ids = _seed_transactions_for_anomaly_detection()
    db = _get_db()
    try:
        # Run detection on the large transaction
        result = AnomalyDetectionService.detect_anomalies(
            db=db,
            transaction_ids=[tx_ids['large_tx_id']],
            force_redetection=True
        )

        assert result['anomalies_detected'] > 0

        # Verify the amount anomaly was created
        anomaly = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.transaction_id == tx_ids['large_tx_id'],
            TransactionAnomaly.anomaly_type == AnomalyType.AMOUNT_ANOMALY
        ).first()

        assert anomaly is not None
        assert anomaly.anomaly_score >= 75  # High percentile should have high score
    finally:
        db.close()


# ── Test: Frequency Anomaly Detection ────────────────────────────────

def test_frequency_anomaly_detection():
    """High frequency merchant transactions should be flagged."""
    tx_ids = _seed_transactions_for_anomaly_detection()
    db = _get_db()
    try:
        # Run detection on the frequent transaction
        result = AnomalyDetectionService.detect_anomalies(
            db=db,
            transaction_ids=[tx_ids['freq_tx_id']],
            force_redetection=True
        )

        # Should detect frequency anomaly (>10 transactions in 30 days)
        anomaly = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.transaction_id == tx_ids['freq_tx_id'],
            TransactionAnomaly.anomaly_type == AnomalyType.FREQUENCY_ANOMALY
        ).first()

        assert anomaly is not None
    finally:
        db.close()


# ── Test: Behavioral Anomaly Detection ────────────────────────────────

def test_behavioral_anomaly_new_category():
    """First-time category usage should be flagged."""
    tx_ids = _seed_transactions_for_anomaly_detection()
    db = _get_db()
    try:
        # Run detection
        result = AnomalyDetectionService.detect_anomalies(
            db=db,
            transaction_ids=[tx_ids['new_category_tx_id']],
            force_redetection=True
        )

        # Verify behavioral anomaly was created
        anomaly = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.transaction_id == tx_ids['new_category_tx_id'],
            TransactionAnomaly.anomaly_type == AnomalyType.BEHAVIORAL_ANOMALY
        ).first()

        assert anomaly is not None
        assert 'First transaction in category' in anomaly.reason
    finally:
        db.close()


# ── Test: Merchant Anomaly Detection ──────────────────────────────────

def test_merchant_anomaly_new_merchant_large_amount():
    """First transaction with new merchant and large amount should be flagged."""
    tx_ids = _seed_transactions_for_anomaly_detection()
    db = _get_db()
    try:
        # Run detection
        result = AnomalyDetectionService.detect_anomalies(
            db=db,
            transaction_ids=[tx_ids['new_merchant_tx_id']],
            force_redetection=True
        )

        # Verify merchant anomaly was created
        anomaly = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.transaction_id == tx_ids['new_merchant_tx_id'],
            TransactionAnomaly.anomaly_type == AnomalyType.MERCHANT_ANOMALY
        ).first()

        assert anomaly is not None
        assert 'new merchant' in anomaly.reason.lower() or 'First transaction' in anomaly.reason
    finally:
        db.close()


# ── Test: Temporal Anomaly Detection ──────────────────────────────────

def test_temporal_anomaly_weekend_essential():
    """Large essential expenses on weekends should be flagged."""
    tx_ids = _seed_transactions_for_anomaly_detection()
    db = _get_db()
    try:
        # Run detection
        result = AnomalyDetectionService.detect_anomalies(
            db=db,
            transaction_ids=[tx_ids['weekend_tx_id']],
            force_redetection=True
        )

        # Verify temporal anomaly was created
        anomaly = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.transaction_id == tx_ids['weekend_tx_id'],
            TransactionAnomaly.anomaly_type == AnomalyType.TEMPORAL_ANOMALY
        ).first()

        assert anomaly is not None
        assert 'weekend' in anomaly.reason.lower()
    finally:
        db.close()


# ── Test: Batch Detection via API ─────────────────────────────────────

def test_api_detect_anomalies():
    """API endpoint should trigger anomaly detection and return results."""
    _seed_transactions_for_anomaly_detection()

    response = client.post('/anomalies/detect', json={
        'force_redetection': True,
        'start_date': '2025-01-01',
        'end_date': '2025-01-31'
    })

    assert response.status_code == 200
    data = response.json()
    assert 'total_transactions_analyzed' in data
    assert 'anomalies_detected' in data
    assert 'processing_time_seconds' in data


# ── Test: Get Anomalies API ───────────────────────────────────────────

def test_api_get_anomalies():
    """API should return paginated list of anomalies."""
    _seed_transactions_for_anomaly_detection()

    # First run detection
    client.post('/anomalies/detect', json={
        'force_redetection': True,
        'start_date': '2025-01-01',
        'end_date': '2025-01-31'
    })

    # Then fetch anomalies
    response = client.get('/anomalies/?page=1&page_size=10')
    assert response.status_code == 200
    data = response.json()
    assert 'items' in data
    assert 'total' in data
    assert 'total_pages' in data


# ── Test: Update Anomaly Status ───────────────────────────────────────

def test_api_update_anomaly_status():
    """API should allow updating anomaly review status."""
    tx_ids = _seed_transactions_for_anomaly_detection()

    # Run detection
    client.post('/anomalies/detect', json={
        'force_redetection': True,
        'start_date': '2025-01-01',
        'end_date': '2025-01-31'
    })

    db = _get_db()
    try:
        # Get first anomaly
        anomaly = db.query(TransactionAnomaly).first()
        assert anomaly is not None

        # Update status via API
        response = client.patch(f'/anomalies/{anomaly.id}/status', json={
            'status': 'Confirmed',
            'review_notes': 'This is a legitimate large purchase'
        })

        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'Confirmed'
        assert data['review_notes'] == 'This is a legitimate large purchase'
    finally:
        db.close()


# ── Test: Anomaly Statistics ──────────────────────────────────────────

def test_api_get_anomaly_statistics():
    """API should return anomaly detection statistics."""
    _seed_transactions_for_anomaly_detection()

    # Run detection
    client.post('/anomalies/detect', json={
        'force_redetection': True,
        'start_date': '2025-01-01',
        'end_date': '2025-01-31'
    })

    response = client.get('/anomalies/statistics')
    assert response.status_code == 200
    data = response.json()
    assert 'total_anomalies' in data
    assert 'unreviewed_anomalies' in data
    assert 'anomalies_by_type' in data
    assert 'anomalies_by_severity' in data


# ── Test: Precomputed Statistics Optimization ─────────────────────────

def test_precompute_statistics_caches_data():
    """Precompute statistics should return cached data for multiple detectors."""
    _seed_transactions_for_anomaly_detection()
    db = _get_db()
    try:
        # Get transactions to analyze
        transactions = db.query(Transaction).filter(
            Transaction.transaction_type == TransactionType.EXPENSE
        ).all()

        # Precompute statistics
        stats = AnomalyDetectionService._precompute_statistics(db, transactions)

        assert 'category_stats' in stats
        assert 'global_amounts' in stats
        assert 'merchant_history' in stats
        assert 'category_usage' in stats
        assert 'config' in stats

        # Verify category stats are populated
        if transactions:
            categories_with_stats = list(stats['category_stats'].keys())
            for tx in transactions:
                if tx.expense_category and tx.expense_category in categories_with_stats:
                    stat = stats['category_stats'][tx.expense_category]
                    assert 'mean' in stat
                    assert 'std' in stat
                    assert 'count' in stat
                    break
    finally:
        db.close()


def test_precompute_statistics_empty_returns_config():
    """Precompute with no transactions should still return the config key."""
    db = _get_db()
    try:
        stats = AnomalyDetectionService._precompute_statistics(db, [])
        assert 'config' in stats
        assert stats['config'] is not None
    finally:
        db.close()


# ── Test: Config Validation ───────────────────────────────────────────

def test_config_rejects_invalid_percentile():
    """Percentile fields outside 0-100 should raise ValueError."""
    db = _get_db()
    try:
        config = AnomalyConfig.get_or_create_default(db)
        with pytest.raises(ValueError):
            config.high_percentile = 150.0
    finally:
        db.close()


def test_config_rejects_invalid_confidence():
    """Confidence fields outside 0-1 should raise ValueError."""
    db = _get_db()
    try:
        config = AnomalyConfig.get_or_create_default(db)
        with pytest.raises(ValueError):
            config.amount_p95_confidence = 2.0
    finally:
        db.close()


def test_config_rejects_non_positive_threshold():
    """Positive-only fields should reject zero/negative values."""
    db = _get_db()
    try:
        config = AnomalyConfig.get_or_create_default(db)
        with pytest.raises(ValueError):
            config.min_sample_size = 0
        with pytest.raises(ValueError):
            config.z_score_threshold = -1.0
    finally:
        db.close()


# ── Test: Force Redetection ───────────────────────────────────────────

def test_force_redetection_replaces_existing():
    """Force redetection should replace existing anomalies."""
    tx_ids = _seed_transactions_for_anomaly_detection()
    db = _get_db()
    try:
        # First detection
        AnomalyDetectionService.detect_anomalies(
            db=db,
            transaction_ids=[tx_ids['outlier_id']],
            force_redetection=True
        )

        # Count anomalies after first detection
        count_after_first = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.transaction_id == tx_ids['outlier_id']
        ).count()

        # Second detection with force (should replace, not duplicate)
        result2 = AnomalyDetectionService.detect_anomalies(
            db=db,
            transaction_ids=[tx_ids['outlier_id']],
            force_redetection=True
        )

        # Count should remain the same (replaced, not duplicated)
        count_after_second = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.transaction_id == tx_ids['outlier_id']
        ).count()

        assert count_after_first == count_after_second
    finally:
        db.close()


# ── Test: Skip Existing Without Force ────────────────────────────────

def test_skip_existing_without_force():
    """Without force_redetection, existing anomalies should be skipped."""
    tx_ids = _seed_transactions_for_anomaly_detection()
    db = _get_db()
    try:
        # First detection
        AnomalyDetectionService.detect_anomalies(
            db=db,
            transaction_ids=[tx_ids['outlier_id']],
            force_redetection=True
        )

        # Second detection without force (should skip)
        result = AnomalyDetectionService.detect_anomalies(
            db=db,
            transaction_ids=[tx_ids['outlier_id']],
            force_redetection=False
        )

        # Should analyze but detect 0 new (already exists)
        assert result['total_transactions_analyzed'] == 1
        # No new anomalies should be created
    finally:
        db.close()


# ── Test: Force redetection clears stale anomalies ────────────────────

def test_force_redetection_clears_stale_when_no_new_anomalies():
    """Force redetection must remove old anomalies even when the transaction
    no longer produces any (regression for stale anomalies after edits)."""
    tx_ids = _seed_transactions_for_anomaly_detection()
    db = _get_db()
    try:
        new_cat_id = tx_ids['new_category_tx_id']

        # Initial detection: HEALTH is a brand-new category -> behavioral anomaly
        AnomalyDetectionService.detect_anomalies(
            db=db, transaction_ids=[new_cat_id], force_redetection=True
        )
        anomaly = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.transaction_id == new_cat_id,
            TransactionAnomaly.anomaly_type == AnomalyType.BEHAVIORAL_ANOMALY
        ).first()
        assert anomaly is not None
        assert 'Health' in anomaly.reason

        # Move it to a heavily-used category so it is no longer "first in category"
        tx = db.query(Transaction).filter(Transaction.id == new_cat_id).first()
        tx.expense_category = ExpenseCategory.GROCERIES
        db.commit()

        # Re-run detection with force; the stale behavioral anomaly must be gone
        AnomalyDetectionService.detect_anomalies(
            db=db, transaction_ids=[new_cat_id], force_redetection=True
        )
        remaining = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.transaction_id == new_cat_id,
            TransactionAnomaly.anomaly_type == AnomalyType.BEHAVIORAL_ANOMALY
        ).all()
        assert remaining == []
    finally:
        db.close()


# ── Test: Category update endpoint refreshes anomalies ────────────────

def test_category_update_refreshes_anomalies():
    """PATCH /transactions/{id}/category should re-run detection so anomalies
    no longer reference the old category."""
    tx_ids = _seed_transactions_for_anomaly_detection()

    # Detect anomalies for the new-category (HEALTH) transaction
    new_cat_id = tx_ids['new_category_tx_id']
    client.post('/anomalies/detect', json={
        'transaction_ids': [new_cat_id],
        'force_redetection': True,
    })

    db = _get_db()
    try:
        stale = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.transaction_id == new_cat_id,
            TransactionAnomaly.anomaly_type == AnomalyType.BEHAVIORAL_ANOMALY
        ).first()
        assert stale is not None and 'Health' in stale.reason
    finally:
        db.close()

    # Recategorize to a well-used category via the API endpoint
    resp = client.patch(
        f'/transactions/{new_cat_id}/category',
        params={'category': 'Groceries', 'transaction_type': 'Expense'},
    )
    assert resp.status_code == 200

    # No anomaly should still reference the old HEALTH category
    db = _get_db()
    try:
        anomalies = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.transaction_id == new_cat_id
        ).all()
        assert all('Health' not in a.reason for a in anomalies)
    finally:
        db.close()
