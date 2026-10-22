from datetime import date
from typing import List, Optional, TypedDict

from dateutil.relativedelta import relativedelta
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from ..models.financial_projection import HoldingsValueHistory
from ..models.statistics import FinancialStatistics, StatisticsPeriod


class ActualNetWorthHistory(TypedDict):
    historical_dates: List[str]
    actual_net_worth: List[Optional[float]]
    real_actual_net_worth: List[Optional[float]]


class HoldingsHistoryService:
    """Tracks month-end holdings market values and derives the actual net worth history."""

    @staticmethod
    def get_reference_month(db: Session) -> date:
        """Month a holdings value refers to: the latest month with statistics (falls back to today)."""
        latest = db.query(FinancialStatistics.date).filter(
            FinancialStatistics.period == StatisticsPeriod.MONTHLY,
            FinancialStatistics.date.isnot(None)
        ).order_by(FinancialStatistics.date.desc()).first()
        return (latest[0] if latest else date.today()).replace(day=1)

    @staticmethod
    def record_value(db: Session, value: float, month: Optional[date] = None) -> HoldingsValueHistory:
        """Upsert the holdings value for the given month (defaults to the reference month). Does not commit."""
        month = month or HoldingsHistoryService.get_reference_month(db)
        entry = db.query(HoldingsValueHistory).filter(
            HoldingsValueHistory.year == month.year,
            HoldingsValueHistory.month == month.month
        ).first()
        if entry:
            entry.value = value
        else:
            entry = HoldingsValueHistory(year=month.year, month=month.month, value=value)
            db.add(entry)
        return entry

    @staticmethod
    def get_actual_net_worth(
        db: Session, end_month: date, months: int, monthly_inflation_rate: float
    ) -> ActualNetWorthHistory:
        """Actual net worth (cumulative net savings + holdings) for the `months` months ending at `end_month`.

        Months without a holdings record or monthly statistics are reported as None.
        Real values are expressed in `end_month` purchasing power, matching the projection's baseline.
        """
        end_month = end_month.replace(day=1)
        start_month = end_month - relativedelta(months=months - 1)

        stats = db.query(FinancialStatistics).filter(
            FinancialStatistics.period == StatisticsPeriod.MONTHLY,
            FinancialStatistics.date >= start_month,
            FinancialStatistics.date < end_month + relativedelta(months=1)
        ).all()
        savings_by_month = {(s.date.year, s.date.month): s.total_net_savings for s in stats}

        holdings = db.query(HoldingsValueHistory).filter(
            or_(
                HoldingsValueHistory.year > start_month.year,
                and_(HoldingsValueHistory.year == start_month.year, HoldingsValueHistory.month >= start_month.month),
            ),
            or_(
                HoldingsValueHistory.year < end_month.year,
                and_(HoldingsValueHistory.year == end_month.year, HoldingsValueHistory.month <= end_month.month),
            ),
        ).all()
        holdings_by_month = {(h.year, h.month): h.value for h in holdings}

        dates: List[str] = []
        nominal: List[Optional[float]] = []
        real: List[Optional[float]] = []
        for i in range(months):
            current = start_month + relativedelta(months=i)
            key = (current.year, current.month)
            dates.append(f"{current.year}-{current.month:02d}")
            if key in savings_by_month and key in holdings_by_month:
                value = savings_by_month[key] + holdings_by_month[key]
                nominal.append(round(value, 2))
                real.append(round(value * (1 + monthly_inflation_rate) ** (months - 1 - i), 2))
            else:
                nominal.append(None)
                real.append(None)

        return {"historical_dates": dates, "actual_net_worth": nominal, "real_actual_net_worth": real}
