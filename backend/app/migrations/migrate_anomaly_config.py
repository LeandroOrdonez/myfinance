"""
Migration: Create anomaly_config table for configurable detection thresholds.
This replaces hardcoded values in the anomaly detection service.
"""
import logging
from sqlalchemy import text, inspect
from ..database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_anomaly_config():
    """Create anomaly_config table with default configuration values."""
    inspector = inspect(engine)

    if "anomaly_config" in inspector.get_table_names():
        logger.info("anomaly_config table already exists, skipping migration")
        return

    logger.info("Creating anomaly_config table...")

    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE anomaly_config (
                id INTEGER PRIMARY KEY,
                z_score_threshold REAL NOT NULL DEFAULT 2.0,
                min_sample_size INTEGER NOT NULL DEFAULT 10,
                high_percentile REAL NOT NULL DEFAULT 95.0,
                critical_percentile REAL NOT NULL DEFAULT 99.0,
                min_amounts_for_percentile INTEGER NOT NULL DEFAULT 20,
                max_merchant_frequency_30d INTEGER NOT NULL DEFAULT 10,
                expected_normal_frequency INTEGER NOT NULL DEFAULT 5,
                weekend_essential_threshold REAL NOT NULL DEFAULT 100.0,
                new_merchant_large_threshold_days INTEGER NOT NULL DEFAULT 90,
                new_merchant_min_transaction_count INTEGER NOT NULL DEFAULT 3,
                merchant_large_amount_threshold REAL NOT NULL DEFAULT 200.0,
                statistical_lookback_days INTEGER NOT NULL DEFAULT 365,
                amount_lookback_days INTEGER NOT NULL DEFAULT 365,
                frequency_lookback_days INTEGER NOT NULL DEFAULT 30,
                default_behavioral_anomaly_score REAL NOT NULL DEFAULT 60.0,
                default_temporal_anomaly_score REAL NOT NULL DEFAULT 65.0,
                default_frequency_anomaly_score REAL NOT NULL DEFAULT 70.0,
                amount_p95_anomaly_score REAL NOT NULL DEFAULT 75.0,
                amount_p99_anomaly_score REAL NOT NULL DEFAULT 90.0,
                default_behavioral_confidence REAL NOT NULL DEFAULT 0.6,
                default_temporal_confidence REAL NOT NULL DEFAULT 0.6,
                default_frequency_confidence REAL NOT NULL DEFAULT 0.7,
                amount_p95_confidence REAL NOT NULL DEFAULT 0.75,
                amount_p99_confidence REAL NOT NULL DEFAULT 0.85,
                default_detection_days INTEGER NOT NULL DEFAULT 90,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))

        # Enforce singleton: only one configuration row is ever allowed
        conn.execute(text("""
            CREATE TRIGGER IF NOT EXISTS prevent_multiple_anomaly_config
            BEFORE INSERT ON anomaly_config
            WHEN (SELECT COUNT(*) FROM anomaly_config) >= 1
            BEGIN
                SELECT RAISE(ABORT, 'Only one anomaly_config row is allowed');
            END
        """))

        # Insert default configuration
        conn.execute(text("""
            INSERT INTO anomaly_config DEFAULT VALUES
        """))

    logger.info("Migration completed: anomaly_config table created with default values")
