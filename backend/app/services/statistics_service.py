from sqlalchemy.orm import Session
from datetime import date
import calendar
from ..models.statistics import FinancialStatistics, StatisticsPeriod
from ..models.transaction import Transaction, TransactionType
from sqlalchemy import func, extract

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
    def update_statistics(db: Session, transaction_date: date):
        # Update daily stats
        daily_stats = db.query(FinancialStatistics).filter(
            FinancialStatistics.period == StatisticsPeriod.DAILY,
            FinancialStatistics.date == transaction_date
        ).first()
        
        if not daily_stats:
            daily_stats = FinancialStatistics(
                period=StatisticsPeriod.DAILY,
                date=transaction_date
            )
            db.add(daily_stats)
        
        daily_data = StatisticsService.calculate_statistics(
            db, StatisticsPeriod.DAILY, transaction_date
        )
        
        # Update monthly stats
        monthly_stats = db.query(FinancialStatistics).filter(
            FinancialStatistics.period == StatisticsPeriod.MONTHLY,
            extract('year', FinancialStatistics.date) == transaction_date.year,
            extract('month', FinancialStatistics.date) == transaction_date.month
        ).first()
        
        if not monthly_stats:
            monthly_stats = FinancialStatistics(
                period=StatisticsPeriod.MONTHLY,
                # set day to the last day of the month
                date=transaction_date.replace(day=calendar.monthrange(transaction_date.year, transaction_date.month)[1])
            )
            db.add(monthly_stats)
        
        monthly_data = StatisticsService.calculate_statistics(
            db, StatisticsPeriod.MONTHLY, transaction_date
        )
        
        # Update all-time stats
        all_time_stats = db.query(FinancialStatistics).filter(
            FinancialStatistics.period == StatisticsPeriod.ALL_TIME
        ).first()
        
        if not all_time_stats:
            all_time_stats = FinancialStatistics(
                period=StatisticsPeriod.ALL_TIME
            )
            db.add(all_time_stats)
        
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
        
        db.commit() 

    @staticmethod
    def initialize_statistics(db: Session):
        """Initialize statistics for all existing transactions"""
        try:
            # Clear existing statistics
            db.query(FinancialStatistics).delete()
            
            # Get all unique dates from transactions
            dates = db.query(
                extract('year', Transaction.transaction_date).label('year'),
                extract('month', Transaction.transaction_date).label('month')
            ).distinct().all()
            
            # Initialize monthly and daily statistics for each date
            for year, month in dates:
                # set day to the last day of the month
                date_obj = date(year=int(year), month=int(month), day=calendar.monthrange(int(year), int(month))[1])
                StatisticsService.update_statistics(db, date_obj)
            
            # Initialize all-time statistics
            all_time_stats = FinancialStatistics(period=StatisticsPeriod.ALL_TIME)
            db.add(all_time_stats)
            all_time_data = StatisticsService.calculate_statistics(db, StatisticsPeriod.ALL_TIME)
            
            for key, value in all_time_data.items():
                setattr(all_time_stats, key, value)
            
            db.commit()
        except Exception as e:
            db.rollback()
            raise e