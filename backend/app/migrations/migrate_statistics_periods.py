from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import logging

from app.database import SQLALCHEMY_DATABASE_URL
from app.services.statistics_service import StatisticsService
from app.models.statistics import StatisticsPeriod

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_statistics_periods():
    """
    Migration to update the statistics_period enum from (daily, monthly, all_time) to (monthly, yearly, all_time)
    - Remove daily stats
    - Add yearly stats
    - Rebuild statistics for all transactions
    """
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Step 1: Delete all daily statistics
        logger.info("Removing daily statistics...")
        db.execute(text("DELETE FROM financial_statistics WHERE period = 'daily'"))
        db.execute(text("DELETE FROM category_statistics WHERE period = 'daily'"))
        db.commit()
        logger.info("Successfully removed daily statistics")

        # Step 2: Add yearly_income and yearly_expenses columns if they don't exist
        logger.info("Ensuring yearly columns exist...")
        try:
            db.execute(text("ALTER TABLE financial_statistics ADD COLUMN yearly_income FLOAT DEFAULT 0"))
            db.execute(text("ALTER TABLE financial_statistics ADD COLUMN yearly_expenses FLOAT DEFAULT 0"))
            db.commit()
            logger.info("Added yearly columns")
        except Exception as e:
            logger.info(f"Yearly columns might already exist: {str(e)}")
            db.rollback()
        
        # Step 3: Recalculate all statistics with the new period structure
        logger.info("Recalculating all statistics...")
        StatisticsService.initialize_statistics(db)
        logger.info("Recalculated financial statistics")
        
        StatisticsService.initialize_category_statistics(db)
        logger.info("Recalculated category statistics")
        
        logger.info("Migration completed successfully")

    except Exception as e:
        db.rollback()
        logger.error(f"Error during migration: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_statistics_periods()