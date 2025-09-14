from sqlalchemy import inspect
import logging
from .database import engine, Base
from .models.transaction import Transaction
from .models.statistics import FinancialStatistics, CategoryStatistics
from .models.financial_health import FinancialHealth, FinancialRecommendation
from .models.financial_projection import ProjectionScenario, ProjectionParameter, ProjectionResult
from .models.anomaly import TransactionAnomaly, AnomalyPattern, AnomalyRule
from .services.statistics_service import StatisticsService
from .services.financial_health_service import FinancialHealthService
from .services.projection_service import ProjectionService
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

    tables_to_check = ["transactions", "financial_statistics", "category_statistics", "financial_health", "financial_recommendations", "projection_scenarios", "projection_parameters", "projection_results", "transaction_anomalies", "anomaly_patterns", "anomaly_rules"]
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
            need_financial_health_init = False
            need_projection_init = False
            
            if "transactions" in existing_tables:
                if "financial_statistics" in missing_tables:
                    need_stats_init = True
                if "category_statistics" in missing_tables:
                    need_category_stats_init = True
                if "financial_health" in missing_tables:
                    need_financial_health_init = True
                if "projection_scenarios" in missing_tables:
                    need_projection_init = True
            
            if need_stats_init or need_category_stats_init or need_financial_health_init or need_projection_init:
                logger.info("Initializing statistics and financial health for existing transactions...")
                with Session(engine) as db:
                    if need_stats_init:
                        logger.info("Initializing financial statistics...")
                        StatisticsService.initialize_statistics(db)
                    if need_category_stats_init:
                        logger.info("Initializing category statistics...")
                        StatisticsService.initialize_category_statistics(db)
                    if need_financial_health_init:
                        logger.info("Initializing financial health scores...")
                        FinancialHealthService.initialize_financial_health(db)
                    if need_projection_init:
                        logger.info("Creating default projection scenarios...")
                        ProjectionService.create_default_scenarios(db)
                logger.info("Statistics and financial health initialized successfully!")
            
        except Exception as e:
            logger.error(f"Error creating database tables: {str(e)}")
            raise
    else:
        logger.info("All required database tables already exist")

def reset_database(reset_type: str = "all"):
    """Drop all tables and recreate them"""
    logger.info("Resetting database...")
    try:
        if reset_type == "all":
            Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)
        elif reset_type == "transactions":
            Base.metadata.drop_all(bind=engine, tables=[Transaction.__table__])
            Base.metadata.create_all(bind=engine, tables=[Transaction.__table__])
        elif reset_type == "statistics":
            Base.metadata.drop_all(bind=engine, tables=[FinancialStatistics.__table__, CategoryStatistics.__table__])
            Base.metadata.create_all(bind=engine, tables=[FinancialStatistics.__table__, CategoryStatistics.__table__])
        elif reset_type == "financial_health":
            Base.metadata.drop_all(bind=engine, tables=[FinancialHealth.__table__, FinancialRecommendation.__table__])
            Base.metadata.create_all(bind=engine, tables=[FinancialHealth.__table__, FinancialRecommendation.__table__])
        elif reset_type == "projections":
            Base.metadata.drop_all(bind=engine, tables=[ProjectionScenario.__table__, ProjectionParameter.__table__, ProjectionResult.__table__])
            Base.metadata.create_all(bind=engine, tables=[ProjectionScenario.__table__, ProjectionParameter.__table__, ProjectionResult.__table__])
        elif reset_type == "anomalies":
            Base.metadata.drop_all(bind=engine, tables=[TransactionAnomaly.__table__, AnomalyPattern.__table__, AnomalyRule.__table__])
            Base.metadata.create_all(bind=engine, tables=[TransactionAnomaly.__table__, AnomalyPattern.__table__, AnomalyRule.__table__])
        logger.info("Database reset successfully!")
    except Exception as e:
        logger.error(f"Error resetting database: {str(e)}")
        raise 