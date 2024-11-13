from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import logging

from app.models.transaction import Transaction, ExpenseCategory
from app.database import SQLALCHEMY_DATABASE_URL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_categories():
    """
    Migrate existing categories:
    - Merge 'HEALTHCARE' and 'CLOTHING' into 'PERSONAL'
    - Split 'FOOD' into 'GROCERIES' (default) and 'EATING_OUT'
    """
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Use raw SQL updates to bypass enum validation
        logger.info("Updating HEALTHCARE and CLOTHING categories to PERSONAL...")
        db.execute(text("""
            UPDATE transactions 
            SET expense_category = 'PERSONAL' 
            WHERE expense_category IN ('HEALTHCARE', 'CLOTHING')
        """))

        logger.info("Updating FOOD category to GROCERIES...")
        db.execute(text("""
            UPDATE transactions 
            SET expense_category = 'GROCERIES' 
            WHERE expense_category = 'FOOD'
        """))
        
        db.commit()
        logger.info("Successfully migrated categories")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error during migration: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_categories()