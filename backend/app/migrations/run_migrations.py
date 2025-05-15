import logging
from app.migrations.migrate_categories import migrate_categories
from app.migrations.migrate_statistics_fields import migrate_statistics_fields
from app.migrations.migrate_statistics_periods import migrate_statistics_periods
from app.migrations.migrate_expense_type import migrate_expense_type

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    try:
        logger.info("Starting migrations...")
        # migrate_categories()
        # migrate_statistics_fields()
        # migrate_statistics_periods()
        migrate_expense_type()
        logger.info("All migrations completed successfully")
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    run_migrations() 