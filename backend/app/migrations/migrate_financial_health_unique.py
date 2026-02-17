"""
Migration: Add score_year and score_month columns with unique constraint to financial_health table.
This prevents duplicate health scores for the same month.
"""
import logging
from sqlalchemy import text, inspect
from ..database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_financial_health_unique():
    """Add score_year/score_month columns and unique constraint, backfill from existing date column."""
    inspector = inspect(engine)
    
    if "financial_health" not in inspector.get_table_names():
        logger.info("financial_health table does not exist yet, skipping migration")
        return
    
    existing_columns = [c["name"] for c in inspector.get_columns("financial_health")]
    
    if "score_year" in existing_columns and "score_month" in existing_columns:
        logger.info("score_year and score_month columns already exist, skipping migration")
        return
    
    logger.info("Adding score_year and score_month columns to financial_health...")
    
    with engine.begin() as conn:
        # 1. Add columns (nullable initially so we can backfill)
        conn.execute(text("ALTER TABLE financial_health ADD COLUMN score_year INTEGER"))
        conn.execute(text("ALTER TABLE financial_health ADD COLUMN score_month INTEGER"))
        
        # 2. Backfill from existing date column
        conn.execute(text("""
            UPDATE financial_health 
            SET score_year = CAST(strftime('%Y', date) AS INTEGER),
                score_month = CAST(strftime('%m', date) AS INTEGER)
        """))
        
        # 3. Remove duplicates: keep only the row with the highest id per (year, month)
        conn.execute(text("""
            DELETE FROM financial_health 
            WHERE id NOT IN (
                SELECT MAX(id) FROM financial_health GROUP BY score_year, score_month
            )
        """))
        
        # 4. Create unique index (SQLite doesn't support ALTER TABLE ADD CONSTRAINT)
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_health_year_month "
            "ON financial_health (score_year, score_month)"
        ))
    
    logger.info("Migration completed: score_year/score_month columns added with unique constraint")
