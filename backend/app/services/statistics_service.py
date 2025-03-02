from sqlalchemy.orm import Session
from datetime import date
import calendar
from ..models.statistics import FinancialStatistics, CategoryStatistics, StatisticsPeriod
from ..models.transaction import Transaction, TransactionType, ExpenseCategory, IncomeCategory
from sqlalchemy import func, extract, and_, or_, text
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StatisticsService:
    @staticmethod
    def calculate_statistics(db: Session, period: StatisticsPeriod, target_date: date = None):
        # Base query for period-specific stats
        period_query = db.query(Transaction)
        
        # Base query for cumulative stats
        cumulative_query = db.query(Transaction)
        
        # New: Base query for yearly stats
        yearly_query = db.query(Transaction)
        
        if period != StatisticsPeriod.ALL_TIME:
            if period == StatisticsPeriod.MONTHLY:
                period_query = period_query.filter(
                    extract('year', Transaction.transaction_date) == target_date.year,
                    extract('month', Transaction.transaction_date) == target_date.month
                )
                cumulative_query = cumulative_query.filter(
                    Transaction.transaction_date <= target_date.replace(day=calendar.monthrange(target_date.year, target_date.month)[1])
                )
                yearly_query = yearly_query.filter(
                    extract('year', Transaction.transaction_date) == target_date.year,
                    Transaction.transaction_date <= target_date.replace(
                        day=calendar.monthrange(target_date.year, target_date.month)[1]
                    )
                )
            elif period == StatisticsPeriod.DAILY:
                period_query = period_query.filter(
                    Transaction.transaction_date == target_date
                )
                cumulative_query = cumulative_query.filter(
                    Transaction.transaction_date <= target_date
                )
        
        # Calculate period-specific stats
        period_transactions = period_query.all()
        period_stats = {
            'period_income': 0,
            'period_expenses': 0,
            'income_count': 0,
            'expense_count': 0
        }
        
        for trans in period_transactions:
            if trans.transaction_type == TransactionType.INCOME:
                period_stats['period_income'] += trans.amount
                period_stats['income_count'] += 1
            else:
                period_stats['period_expenses'] += abs(trans.amount)
                period_stats['expense_count'] += 1
        
        # Calculate cumulative stats
        cumulative_transactions = cumulative_query.all()
        cumulative_stats = {
            'total_income': 0,
            'total_expenses': 0
        }
        
        for trans in cumulative_transactions:
            if trans.transaction_type == TransactionType.INCOME:
                cumulative_stats['total_income'] += trans.amount
            else:
                cumulative_stats['total_expenses'] += abs(trans.amount)
        
        # New: Calculate yearly stats
        yearly_transactions = yearly_query.all()
        yearly_stats = {
            'yearly_income': 0,
            'yearly_expenses': 0
        }
        
        for trans in yearly_transactions:
            if trans.transaction_type == TransactionType.INCOME:
                yearly_stats['yearly_income'] += trans.amount
            else:
                yearly_stats['yearly_expenses'] += abs(trans.amount)
        
        # Calculate derived statistics
        period_stats['period_net_savings'] = period_stats['period_income'] - period_stats['period_expenses']
        period_stats['savings_rate'] = (period_stats['period_net_savings'] / period_stats['period_income'] * 100) if period_stats['period_income'] > 0 else 0
        
        cumulative_stats['total_net_savings'] = cumulative_stats['total_income'] - cumulative_stats['total_expenses']
        
        # Calculate averages
        period_stats['average_income'] = period_stats['period_income'] / period_stats['income_count'] if period_stats['income_count'] > 0 else 0
        period_stats['average_expense'] = period_stats['period_expenses'] / period_stats['expense_count'] if period_stats['expense_count'] > 0 else 0
        
        # Combine all stats
        return {**period_stats, **cumulative_stats, **yearly_stats}

    @staticmethod
    def calculate_category_statistics(db: Session, period: StatisticsPeriod, target_date: date = None):
        """
        Calculate statistics for each category for the given period
        """
        # Base queries for different time periods
        period_query = db.query(Transaction)
        cumulative_query = db.query(Transaction)
        yearly_query = db.query(Transaction)
        
        # Apply time filters
        if period != StatisticsPeriod.ALL_TIME:
            if period == StatisticsPeriod.MONTHLY:
                period_query = period_query.filter(
                    extract('year', Transaction.transaction_date) == target_date.year,
                    extract('month', Transaction.transaction_date) == target_date.month
                )
                cumulative_query = cumulative_query.filter(
                    Transaction.transaction_date <= target_date.replace(day=calendar.monthrange(target_date.year, target_date.month)[1])
                )
                yearly_query = yearly_query.filter(
                    extract('year', Transaction.transaction_date) == target_date.year,
                    Transaction.transaction_date <= target_date.replace(
                        day=calendar.monthrange(target_date.year, target_date.month)[1]
                    )
                )
            elif period == StatisticsPeriod.DAILY:
                period_query = period_query.filter(
                    Transaction.transaction_date == target_date
                )
                cumulative_query = cumulative_query.filter(
                    Transaction.transaction_date <= target_date
                )
        
        # Build filters based on period
        period_filters = []
        if period != StatisticsPeriod.ALL_TIME:
            if period == StatisticsPeriod.MONTHLY:
                period_filters = [
                    extract('year', Transaction.transaction_date) == target_date.year,
                    extract('month', Transaction.transaction_date) == target_date.month
                ]
            elif period == StatisticsPeriod.DAILY:
                period_filters = [Transaction.transaction_date == target_date]
                
        # Get period totals for percentage calculations
        period_income_total = db.query(func.sum(Transaction.amount)).filter(
            Transaction.transaction_type == TransactionType.INCOME,
            *period_filters
        ).scalar() or 0
        
        period_expense_total = db.query(func.sum(func.abs(Transaction.amount))).filter(
            Transaction.transaction_type == TransactionType.EXPENSE,
            *period_filters
        ).scalar() or 0
        
        # Get all expense categories
        expense_categories = []
        for cat in ExpenseCategory:
            # Period-specific stats
            period_amount = db.query(func.sum(func.abs(Transaction.amount))).filter(
                Transaction.expense_category == cat,
                *period_filters
            ).scalar() or 0
            
            period_count = db.query(func.count(Transaction.id)).filter(
                Transaction.expense_category == cat,
                *period_filters
            ).scalar() or 0
            
            # Calculate percentage of total expenses
            period_percentage = (period_amount / period_expense_total * 100) if period_expense_total > 0 else 0
            
            # Build cumulative filters
            cumulative_filters = []
            if period != StatisticsPeriod.ALL_TIME:
                if period == StatisticsPeriod.MONTHLY:
                    cumulative_filters = [
                        Transaction.transaction_date <= target_date.replace(
                            day=calendar.monthrange(target_date.year, target_date.month)[1]
                        )
                    ]
                elif period == StatisticsPeriod.DAILY:
                    cumulative_filters = [Transaction.transaction_date <= target_date]
            
            # Cumulative stats
            total_amount = db.query(func.sum(func.abs(Transaction.amount))).filter(
                Transaction.expense_category == cat,
                *cumulative_filters
            ).scalar() or 0
            
            total_count = db.query(func.count(Transaction.id)).filter(
                Transaction.expense_category == cat,
                *cumulative_filters
            ).scalar() or 0
            
            # Build yearly filters
            yearly_filters = []
            if period != StatisticsPeriod.ALL_TIME:
                if period == StatisticsPeriod.MONTHLY or period == StatisticsPeriod.DAILY:
                    yearly_filters = [
                        extract('year', Transaction.transaction_date) == target_date.year,
                        Transaction.transaction_date <= target_date.replace(
                            day=calendar.monthrange(target_date.year, target_date.month)[1]
                        )
                    ]
            
            # Yearly stats
            yearly_amount = db.query(func.sum(func.abs(Transaction.amount))).filter(
                Transaction.expense_category == cat,
                *yearly_filters
            ).scalar() or 0
            
            yearly_count = db.query(func.count(Transaction.id)).filter(
                Transaction.expense_category == cat,
                *yearly_filters
            ).scalar() or 0
            
            # Average transaction amount
            avg_amount = period_amount / period_count if period_count > 0 else 0
            
            expense_categories.append({
                'category_name': cat.value,
                'transaction_type': TransactionType.EXPENSE,
                'period_amount': period_amount,
                'period_transaction_count': period_count,
                'period_percentage': period_percentage,
                'total_amount': total_amount,
                'total_transaction_count': total_count,
                'average_transaction_amount': avg_amount,
                'yearly_amount': yearly_amount,
                'yearly_transaction_count': yearly_count
            })
        
        # Get all income categories
        income_categories = []
        for cat in IncomeCategory:
            # Period-specific stats
            period_amount = db.query(func.sum(Transaction.amount)).filter(
                Transaction.income_category == cat,
                *period_filters
            ).scalar() or 0
            
            period_count = db.query(func.count(Transaction.id)).filter(
                Transaction.income_category == cat,
                *period_filters
            ).scalar() or 0
            
            # Calculate percentage of total income
            period_percentage = (period_amount / period_income_total * 100) if period_income_total > 0 else 0
            
            # Build cumulative filters (reusing from above)
            cumulative_filters = []
            if period != StatisticsPeriod.ALL_TIME:
                if period == StatisticsPeriod.MONTHLY:
                    cumulative_filters = [
                        Transaction.transaction_date <= target_date.replace(
                            day=calendar.monthrange(target_date.year, target_date.month)[1]
                        )
                    ]
                elif period == StatisticsPeriod.DAILY:
                    cumulative_filters = [Transaction.transaction_date <= target_date]
                    
            # Cumulative stats
            total_amount = db.query(func.sum(Transaction.amount)).filter(
                Transaction.income_category == cat,
                *cumulative_filters
            ).scalar() or 0
            
            total_count = db.query(func.count(Transaction.id)).filter(
                Transaction.income_category == cat,
                *cumulative_filters
            ).scalar() or 0
            
            # Build yearly filters (reusing from above)
            yearly_filters = []
            if period != StatisticsPeriod.ALL_TIME:
                if period == StatisticsPeriod.MONTHLY or period == StatisticsPeriod.DAILY:
                    yearly_filters = [
                        extract('year', Transaction.transaction_date) == target_date.year,
                        Transaction.transaction_date <= target_date.replace(
                            day=calendar.monthrange(target_date.year, target_date.month)[1]
                        )
                    ]
            
            # Yearly stats
            yearly_amount = db.query(func.sum(Transaction.amount)).filter(
                Transaction.income_category == cat,
                *yearly_filters
            ).scalar() or 0
            
            yearly_count = db.query(func.count(Transaction.id)).filter(
                Transaction.income_category == cat,
                *yearly_filters
            ).scalar() or 0
            
            # Average transaction amount
            avg_amount = period_amount / period_count if period_count > 0 else 0
            
            income_categories.append({
                'category_name': cat.value,
                'transaction_type': TransactionType.INCOME,
                'period_amount': period_amount,
                'period_transaction_count': period_count,
                'period_percentage': period_percentage,
                'total_amount': total_amount,
                'total_transaction_count': total_count,
                'average_transaction_amount': avg_amount,
                'yearly_amount': yearly_amount,
                'yearly_transaction_count': yearly_count
            })
        
        return expense_categories + income_categories

    @staticmethod
    def update_statistics(db: Session, transaction_date: date):
        """
        Update statistics for the given transaction date.
        Uses row-level locking to prevent concurrent updates from causing inconsistencies.
        """
        # Get all statistics that need updating with FOR UPDATE lock 
        # to prevent concurrent modifications
        
        # Update daily stats
        daily_stats = db.query(FinancialStatistics).filter(
            FinancialStatistics.period == StatisticsPeriod.DAILY,
            FinancialStatistics.date == transaction_date
        ).with_for_update().first()
        
        if not daily_stats:
            daily_stats = FinancialStatistics(
                period=StatisticsPeriod.DAILY,
                date=transaction_date
            )
            db.add(daily_stats)
            db.flush()  # Ensure it's in the DB before calculating
        
        # Update monthly stats
        monthly_date = transaction_date.replace(day=calendar.monthrange(transaction_date.year, transaction_date.month)[1])
        monthly_stats = db.query(FinancialStatistics).filter(
            FinancialStatistics.period == StatisticsPeriod.MONTHLY,
            FinancialStatistics.date == monthly_date
        ).with_for_update().first()
        
        if not monthly_stats:
            monthly_stats = FinancialStatistics(
                period=StatisticsPeriod.MONTHLY,
                date=monthly_date
            )
            db.add(monthly_stats)
            db.flush()  # Ensure it's in the DB before calculating
        
        # Update all-time stats
        all_time_stats = db.query(FinancialStatistics).filter(
            FinancialStatistics.period == StatisticsPeriod.ALL_TIME
        ).with_for_update().first()
        
        if not all_time_stats:
            all_time_stats = FinancialStatistics(
                period=StatisticsPeriod.ALL_TIME
            )
            db.add(all_time_stats)
            db.flush()  # Ensure it's in the DB before calculating
        
        # Now that we have locks on all relevant statistics rows,
        # calculate the updated values
        daily_data = StatisticsService.calculate_statistics(
            db, StatisticsPeriod.DAILY, transaction_date
        )
        
        monthly_data = StatisticsService.calculate_statistics(
            db, StatisticsPeriod.MONTHLY, transaction_date
        )
        
        all_time_data = StatisticsService.calculate_statistics(
            db, StatisticsPeriod.ALL_TIME
        )
        
        # Update all statistics objects
        for stats_obj, data in [
            (daily_stats, daily_data),
            (monthly_stats, monthly_data),
            (all_time_stats, all_time_data)
        ]:
            for key, value in data.items():
                setattr(stats_obj, key, value)
                
        # Update category statistics
        StatisticsService.update_category_statistics(db, transaction_date)
        
        db.commit()

    @staticmethod
    def update_category_statistics(db: Session, transaction_date: date):
        """
        Update category statistics for the given transaction date.
        """
        try:
            # Calculate end of month date for monthly stats
            monthly_date = transaction_date.replace(day=calendar.monthrange(transaction_date.year, transaction_date.month)[1])
            
            # Clear existing category statistics for this date
            db.query(CategoryStatistics).filter(
                CategoryStatistics.period == StatisticsPeriod.DAILY,
                CategoryStatistics.date == transaction_date
            ).delete()
            
            db.query(CategoryStatistics).filter(
                CategoryStatistics.period == StatisticsPeriod.MONTHLY,
                CategoryStatistics.date == monthly_date
            ).delete()
            
            # Calculate new category statistics
            daily_categories = StatisticsService.calculate_category_statistics(
                db, StatisticsPeriod.DAILY, transaction_date
            )
            
            monthly_categories = StatisticsService.calculate_category_statistics(
                db, StatisticsPeriod.MONTHLY, transaction_date
            )
            
            all_time_categories = StatisticsService.calculate_category_statistics(
                db, StatisticsPeriod.ALL_TIME
            )
            
            # Create and save daily category statistics
            for cat_data in daily_categories:
                if cat_data['period_transaction_count'] > 0:
                    cat_stat = CategoryStatistics(
                        period=StatisticsPeriod.DAILY,
                        date=transaction_date,
                        **cat_data
                    )
                    db.add(cat_stat)
            
            # Create and save monthly category statistics
            for cat_data in monthly_categories:
                if cat_data['period_transaction_count'] > 0:
                    cat_stat = CategoryStatistics(
                        period=StatisticsPeriod.MONTHLY,
                        date=monthly_date,
                        **cat_data
                    )
                    db.add(cat_stat)
            
            # Update or create all-time category statistics
            db.query(CategoryStatistics).filter(
                CategoryStatistics.period == StatisticsPeriod.ALL_TIME
            ).delete()
            
            for cat_data in all_time_categories:
                if cat_data['period_transaction_count'] > 0:
                    cat_stat = CategoryStatistics(
                        period=StatisticsPeriod.ALL_TIME,
                        **cat_data
                    )
                    db.add(cat_stat)
            
            db.flush()
                
        except Exception as e:
            logger.error(f"Error updating category statistics: {str(e)}")
            raise e

    @staticmethod
    def initialize_statistics(db: Session):
        """Initialize financial statistics for all existing transactions"""
        try:
            # Lock the database to prevent any concurrent modifications during initialization
            # This is an administrative operation that should run when the system is not heavily used
            db.execute(text("BEGIN"))
            
            # Clear existing financial statistics
            db.query(FinancialStatistics).delete()
            db.flush()
            
            # Get all unique dates from transactions
            dates = db.query(
                extract('year', Transaction.transaction_date).label('year'),
                extract('month', Transaction.transaction_date).label('month')
            ).distinct().all()
            
            # Initialize monthly and daily statistics for each date
            for year, month in dates:
                # set day to the last day of the month
                date_obj = date(year=int(year), month=int(month), day=calendar.monthrange(int(year), int(month))[1])
                
                # Use a modified version of update_statistics that doesn't require locks
                # since we already have an exclusive lock on the entire statistics table
                
                # Daily stats for the last day of month (representative)
                daily_stats = FinancialStatistics(
                    period=StatisticsPeriod.DAILY,
                    date=date_obj
                )
                db.add(daily_stats)
                
                # Monthly stats
                monthly_stats = FinancialStatistics(
                    period=StatisticsPeriod.MONTHLY,
                    date=date_obj
                )
                db.add(monthly_stats)
                
                # Calculate statistics
                daily_data = StatisticsService.calculate_statistics(db, StatisticsPeriod.DAILY, date_obj)
                monthly_data = StatisticsService.calculate_statistics(db, StatisticsPeriod.MONTHLY, date_obj)
                
                # Update the statistics objects
                for stats_obj, data in [(daily_stats, daily_data), (monthly_stats, monthly_data)]:
                    for key, value in data.items():
                        setattr(stats_obj, key, value)
            
            # Initialize all-time statistics
            all_time_stats = FinancialStatistics(period=StatisticsPeriod.ALL_TIME)
            db.add(all_time_stats)
            all_time_data = StatisticsService.calculate_statistics(db, StatisticsPeriod.ALL_TIME)
            
            for key, value in all_time_data.items():
                setattr(all_time_stats, key, value)
            
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Error initializing financial statistics: {str(e)}")
            raise e
            
    @staticmethod
    def initialize_category_statistics(db: Session):
        """Initialize category statistics for all existing transactions"""
        try:
            # Lock the database to prevent any concurrent modifications during initialization
            # This is an administrative operation that should run when the system is not heavily used
            db.execute(text("BEGIN"))
            
            # Clear existing category statistics
            db.query(CategoryStatistics).delete()
            db.flush()
            
            # Get all unique dates from transactions
            dates = db.query(
                extract('year', Transaction.transaction_date).label('year'),
                extract('month', Transaction.transaction_date).label('month')
            ).distinct().all()
            
            # Initialize monthly and daily category statistics for each date
            for year, month in dates:
                # set day to the last day of the month
                date_obj = date(year=int(year), month=int(month), day=calendar.monthrange(int(year), int(month))[1])
                
                # Calculate category statistics
                daily_categories = StatisticsService.calculate_category_statistics(
                    db, StatisticsPeriod.DAILY, date_obj
                )
                
                monthly_categories = StatisticsService.calculate_category_statistics(
                    db, StatisticsPeriod.MONTHLY, date_obj
                )
                
                # Create and save daily category statistics
                for cat_data in daily_categories:
                    if cat_data['period_transaction_count'] > 0:
                        cat_stat = CategoryStatistics(
                            period=StatisticsPeriod.DAILY,
                            date=date_obj,
                            **cat_data
                        )
                        db.add(cat_stat)
                
                # Create and save monthly category statistics
                for cat_data in monthly_categories:
                    if cat_data['period_transaction_count'] > 0:
                        cat_stat = CategoryStatistics(
                            period=StatisticsPeriod.MONTHLY,
                            date=date_obj,
                            **cat_data
                        )
                        db.add(cat_stat)
            
            # Initialize all-time category statistics
            all_time_categories = StatisticsService.calculate_category_statistics(
                db, StatisticsPeriod.ALL_TIME
            )
            
            for cat_data in all_time_categories:
                if cat_data['period_transaction_count'] > 0:
                    cat_stat = CategoryStatistics(
                        period=StatisticsPeriod.ALL_TIME,
                        **cat_data
                    )
                    db.add(cat_stat)
            
            db.commit()
            logger.info("Category statistics initialized successfully")
        except Exception as e:
            db.rollback()
            logger.error(f"Error initializing category statistics: {str(e)}")
            raise e