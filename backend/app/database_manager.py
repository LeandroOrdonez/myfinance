from sqlalchemy import inspect
import logging
from enum import Enum
from typing import Optional
from .database import engine, Base
from .models.transaction import Transaction
from .models.statistics import FinancialStatistics, CategoryStatistics
from .models.financial_health import FinancialHealthScore, Recommendation, HealthGoal
from .services.statistics_service import StatisticsService
from sqlalchemy.orm import Session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Entity groups
class EntityGroup(Enum):
    TRANSACTIONS = "transactions"
    STATISTICS = "statistics"
    FINANCIAL_HEALTH = "financial_health"

def init_database():
    """Initialize the database and create all tables"""
    logger.info("Initializing database...")
    
    # Check if database exists and has all tables
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    logger.info(f"Existing tables: {existing_tables}")

    tables_to_check = ["transactions", "financial_statistics", "category_statistics", "financial_health_scores", "recommendations", "health_goals"]
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

def reset_database(reset_type: Optional[EntityGroup] = None):
    """Drop all tables and recreate them"""
    logger.info("Resetting database...")
    try:
        if reset_type == EntityGroup.TRANSACTIONS:
            Base.metadata.drop_all(bind=engine, tables=[Transaction.__table__])
            Base.metadata.create_all(bind=engine, tables=[Transaction.__table__])
        elif reset_type == EntityGroup.STATISTICS:
            Base.metadata.drop_all(bind=engine, tables=[FinancialStatistics.__table__, CategoryStatistics.__table__])
            Base.metadata.create_all(bind=engine, tables=[FinancialStatistics.__table__, CategoryStatistics.__table__])
        elif reset_type == EntityGroup.FINANCIAL_HEALTH:
            Base.metadata.drop_all(bind=engine, tables=[FinancialHealthScore.__table__, Recommendation.__table__, HealthGoal.__table__])
            Base.metadata.create_all(bind=engine, tables=[FinancialHealthScore.__table__, Recommendation.__table__, HealthGoal.__table__])
        else:
            Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)
        logger.info("Database reset successfully!")
    except Exception as e:
        logger.error(f"Error resetting database: {str(e)}")
        raise 