"""
Migration: Create budgets table for per-category monthly spending limits.
"""
import logging
from sqlalchemy import text, inspect
from ..database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_budgets():
    """Create budgets table if it does not already exist."""
    inspector = inspect(engine)

    if "budgets" in inspector.get_table_names():
        logger.info("budgets table already exists, skipping migration")
        return

    logger.info("Creating budgets table...")

    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE budgets (
                id INTEGER PRIMARY KEY,
                category VARCHAR(100) NOT NULL,
                limit_amount REAL NOT NULL,
                period VARCHAR(20) NOT NULL DEFAULT 'monthly',
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(category)
            )
        """))

    logger.info("Migration completed: budgets table created")
