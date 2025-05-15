import sys
import os
import logging
from sqlalchemy import create_engine, Column, Enum, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.models.transaction import ExpenseCategory, ExpenseType
from app.models.statistics import CategoryStatistics
from app.database import Base, get_db, engine

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def migrate_expense_type():
    """
    Add expense_type column to category_statistics table and populate it for existing records
    """
    logger.info("Starting expense type migration...")
    
    # Check if the column already exists
    from sqlalchemy import inspect
    inspector = inspect(engine)
    columns = [col["name"] for col in inspector.get_columns("category_statistics")]
    
    if "expense_type" in columns:
        logger.info("expense_type column already exists in category_statistics table. Skipping column creation.")
    else:
        # Add the column
        logger.info("Adding expense_type column to category_statistics table...")
        with engine.begin() as conn:
            conn.execute(text(
                "ALTER TABLE category_statistics ADD COLUMN expense_type VARCHAR(20)"
            ))
        logger.info("expense_type column added successfully.")
    
    # Update existing expense category records with the appropriate expense type
    logger.info("Updating existing expense category records with expense types...")
    db = next(get_db())
    
    try:
        # Get all expense category statistics
        expense_stats = db.query(CategoryStatistics).filter(
            CategoryStatistics.transaction_type == "Expense"
        ).all()
        
        logger.info(f"Found {len(expense_stats)} expense category records to update.")
        
        # Update each record with the appropriate expense type
        for stat in expense_stats:
            try:
                # Get the expense category enum from the category name
                category = ExpenseCategory(stat.category_name)
                # Set the expense type
                stat.expense_type = category.expense_type
            except (ValueError, AttributeError) as e:
                logger.warning(f"Could not update expense type for category {stat.category_name}: {str(e)}")
                continue
        
        # Commit the changes
        db.commit()
        logger.info("Successfully updated expense types for existing category statistics.")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating expense types: {str(e)}")
        raise
    finally:
        db.close()
    
    logger.info("Expense type migration completed successfully.")

if __name__ == "__main__":
    migrate_expense_type()
