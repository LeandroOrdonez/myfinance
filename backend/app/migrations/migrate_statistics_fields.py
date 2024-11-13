from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import logging

from app.database import SQLALCHEMY_DATABASE_URL
from app.models.statistics import FinancialStatistics, StatisticsPeriod
from app.services.statistics_service import StatisticsService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_statistics_fields():
    """
    Migrate statistics table:
    - Rename existing fields to period-specific names
    - Add new cumulative fields and transaction counts
    - Recalculate all statistics
    """
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Step 1: Rename existing columns
        logger.info("Renaming existing columns...")
        rename_statements = [
            "ALTER TABLE financial_statistics RENAME COLUMN total_income TO period_income",
            "ALTER TABLE financial_statistics RENAME COLUMN total_expenses TO period_expenses",
            "ALTER TABLE financial_statistics RENAME COLUMN net_savings TO period_net_savings"
        ]
        
        for statement in rename_statements:
            db.execute(text(statement))
            db.commit()
            logger.info(f"Executed: {statement}")

        # Step 2: Add new columns
        logger.info("Adding new columns...")
        add_column_statements = [
            # Add cumulative columns
            "ALTER TABLE financial_statistics ADD COLUMN total_income FLOAT DEFAULT 0",
            "ALTER TABLE financial_statistics ADD COLUMN total_expenses FLOAT DEFAULT 0",
            "ALTER TABLE financial_statistics ADD COLUMN total_net_savings FLOAT DEFAULT 0",
            
            # Add transaction count columns
            # "ALTER TABLE financial_statistics ADD COLUMN income_count INTEGER DEFAULT 0",
            "ALTER TABLE financial_statistics ADD COLUMN expense_count INTEGER DEFAULT 0",
            
            # Add average columns
            "ALTER TABLE financial_statistics ADD COLUMN average_income FLOAT DEFAULT 0",
            "ALTER TABLE financial_statistics ADD COLUMN average_expense FLOAT DEFAULT 0"
        ]
        
        for statement in add_column_statements:
            db.execute(text(statement))
            db.commit()
            logger.info(f"Executed: {statement}")

        logger.info("Successfully updated table structure")

        # Step 3: Recalculate all statistics
        logger.info("Recalculating statistics...")
        StatisticsService.initialize_statistics(db)
        logger.info("Successfully recalculated statistics")

    except Exception as e:
        db.rollback()
        logger.error(f"Error during migration: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_statistics_fields() 