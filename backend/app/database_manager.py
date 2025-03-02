from sqlalchemy import inspect
import logging
from .database import engine, Base
from .models.transaction import Transaction
from .models.statistics import FinancialStatistics, CategoryStatistics
from .services.statistics_service import StatisticsService
from sqlalchemy.orm import Session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_database():
    """Initialize the database and create all tables"""
    logger.info("Initializing database...")
    
    # Check if database exists and has all tables
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    logger.info(f"Existing tables: {existing_tables}")

    tables_to_check = ["transactions", "financial_statistics", "category_statistics"]
    missing_tables = [table for table in tables_to_check if table not in existing_tables]

    if missing_tables:
        logger.info(f"Creating missing tables: {missing_tables}")
        try:
            # Create all tables
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully!")
            
            # Verify tables were created
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            logger.info(f"Tables after creation: {tables}")
            
            # Log columns for each table
            for table in tables:
                columns = [c['name'] for c in inspector.get_columns(table)]
                logger.info(f"Columns in {table} table: {columns}")

            # Initialize statistics if transactions table already existed
            need_stats_init = False
            need_category_stats_init = False
            
            if "transactions" in existing_tables:
                if "financial_statistics" in missing_tables:
                    need_stats_init = True
                if "category_statistics" in missing_tables:
                    need_category_stats_init = True
            
            if need_stats_init or need_category_stats_init:
                logger.info("Initializing statistics for existing transactions...")
                with Session(engine) as db:
                    if need_stats_init:
                        logger.info("Initializing financial statistics...")
                        StatisticsService.initialize_statistics(db)
                    if need_category_stats_init:
                        logger.info("Initializing category statistics...")
                        StatisticsService.initialize_category_statistics(db)
                logger.info("Statistics initialized successfully!")
            
        except Exception as e:
            logger.error(f"Error creating database tables: {str(e)}")
            raise
    else:
        logger.info("All required database tables already exist")

def reset_database():
    """Drop all tables and recreate them"""
    logger.info("Resetting database...")
    try:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        logger.info("Database reset successfully!")
    except Exception as e:
        logger.error(f"Error resetting database: {str(e)}")
        raise 