from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, extract
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Optional, Tuple
import json
import logging
import statistics
import math
import numpy as np
from collections import defaultdict, Counter

from ..models.transaction import Transaction, TransactionType, ExpenseCategory, IncomeCategory
from ..models.anomaly import (
    TransactionAnomaly, AnomalyPattern, AnomalyRule,
    AnomalyType, AnomalySeverity, AnomalyStatus, AnomalyConfig
)
from ..schemas.anomaly import AnomalyCreate

logger = logging.getLogger(__name__)


class AnomalyScoringStrategy:
    """Unified scoring calculation strategy for all anomaly types"""

    @staticmethod
    def from_z_score(z_score: float, threshold: float = 2.0) -> Tuple[float, float]:
        """Convert Z-score to anomaly score (0-100) and confidence (0-1)"""
        if z_score <= threshold:
            return 0.0, 0.0

        max_expected_z = 4.0
        normalized = (z_score - threshold) / (max_expected_z - threshold)
        anomaly_score = min(100.0, 50 + (normalized * 50))
        confidence = min(1.0, 0.5 + (normalized * 0.5))
        return anomaly_score, confidence


class AnomalyDetectionService:

    # Severity thresholds (anomaly scores 0-100) - these are severity mappings, not tunable thresholds
    SEVERITY_THRESHOLDS = {
        AnomalySeverity.LOW: (50, 70),
        AnomalySeverity.MEDIUM: (70, 85),
        AnomalySeverity.HIGH: (85, 95),
        AnomalySeverity.CRITICAL: (95, 100)
    }

    @staticmethod
    def _get_config(db: Session) -> AnomalyConfig:
        """Get or create default anomaly configuration"""
        return AnomalyConfig.get_or_create_default(db)

    @staticmethod
    def detect_anomalies(
        db: Session,
        transaction_ids: Optional[List[int]] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        force_redetection: bool = False
    ) -> Dict:
        """Main anomaly detection method"""
        start_time = datetime.now()
        config = AnomalyDetectionService._get_config(db)

        # Build query for transactions to analyze
        query = db.query(Transaction)

        if transaction_ids:
            query = query.filter(Transaction.id.in_(transaction_ids))
        else:
            if start_date:
                query = query.filter(Transaction.transaction_date >= start_date)
            if end_date:
                query = query.filter(Transaction.transaction_date <= end_date)

            # Default to configured detection window if no filters
            if not start_date and not end_date:
                cutoff_date = date.today() - timedelta(days=config.default_detection_days)
                query = query.filter(Transaction.transaction_date >= cutoff_date)
        
        # Only analyze expense transactions
        query = query.filter(Transaction.transaction_type == TransactionType.EXPENSE)
        transactions = query.all()
        
        if not transactions:
            return {
                "total_transactions_analyzed": 0,
                "anomalies_detected": 0,
                "anomalies_by_type": {},
                "anomalies_by_severity": {},
                "processing_time_seconds": 0
            }
        
        # Precompute all statistics to avoid N+1 queries
        precomputed_stats = AnomalyDetectionService._precompute_statistics(db, transactions)

        # Update patterns before detection
        AnomalyDetectionService._update_patterns(db, transactions)

        anomalies_detected = 0
        anomalies_by_type = defaultdict(int)
        anomalies_by_severity = defaultdict(int)

        for transaction in transactions:
            if force_redetection:
                # Remove any existing anomalies up-front so stale records are
                # cleared even when the transaction no longer produces any
                # anomalies (e.g. after a category change).
                db.query(TransactionAnomaly).filter(
                    TransactionAnomaly.transaction_id == transaction.id
                ).delete()
            else:
                # Skip if already has anomalies and not forcing redetection
                existing = db.query(TransactionAnomaly).filter(
                    TransactionAnomaly.transaction_id == transaction.id
                ).first()
                if existing:
                    continue

            # Run all detection methods with precomputed stats
            detected_anomalies = []

            # 1. Statistical outlier detection
            stat_anomalies = AnomalyDetectionService._detect_statistical_outliers(db, transaction, precomputed_stats)
            detected_anomalies.extend(stat_anomalies)

            # 2. Temporal anomaly detection
            temp_anomalies = AnomalyDetectionService._detect_temporal_anomalies(db, transaction, precomputed_stats)
            detected_anomalies.extend(temp_anomalies)

            # 3. Amount anomaly detection
            amount_anomalies = AnomalyDetectionService._detect_amount_anomalies(db, transaction, precomputed_stats)
            detected_anomalies.extend(amount_anomalies)

            # 4. Frequency anomaly detection
            freq_anomalies = AnomalyDetectionService._detect_frequency_anomalies(db, transaction, precomputed_stats)
            detected_anomalies.extend(freq_anomalies)

            # 5. Behavioral anomaly detection
            behav_anomalies = AnomalyDetectionService._detect_behavioral_anomalies(db, transaction, precomputed_stats)
            detected_anomalies.extend(behav_anomalies)

            # 6. Merchant anomaly detection
            merchant_anomalies = AnomalyDetectionService._detect_merchant_anomalies(db, transaction, precomputed_stats)
            detected_anomalies.extend(merchant_anomalies)
            
            # Save detected anomalies (existing ones already cleared above when
            # force_redetection is set)
            for anomaly_data in detected_anomalies:
                anomaly = TransactionAnomaly(**anomaly_data)
                db.add(anomaly)

                anomalies_detected += 1
                anomalies_by_type[anomaly_data['anomaly_type'].value] += 1
                anomalies_by_severity[anomaly_data['severity'].value] += 1
        
        db.commit()
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return {
            "total_transactions_analyzed": len(transactions),
            "anomalies_detected": anomalies_detected,
            "anomalies_by_type": dict(anomalies_by_type),
            "anomalies_by_severity": dict(anomalies_by_severity),
            "processing_time_seconds": processing_time
        }

    @staticmethod
    def _detect_statistical_outliers(db: Session, transaction: Transaction, precomputed_stats: Optional[Dict] = None) -> List[Dict]:
        """Detect statistical outliers using Z-score and IQR methods"""
        anomalies = []
        config = AnomalyDetectionService._get_config(db) if not precomputed_stats else precomputed_stats['config']

        # Only analyze expenses and use expense category
        if transaction.transaction_type != TransactionType.EXPENSE:
            return anomalies

        # Get category for comparison (expenses only)
        category = transaction.expense_category
        if not category:
            return anomalies

        # Use precomputed stats if available
        if precomputed_stats and category in precomputed_stats.get('category_stats', {}):
            stats = precomputed_stats['category_stats'][category]
            mean_amount = stats['mean']
            std_amount = stats['std']
            sample_size = stats['count']
        else:
            # Fallback to individual query
            historical = db.query(Transaction.amount).filter(
                and_(
                    Transaction.id != transaction.id,
                    Transaction.transaction_type == TransactionType.EXPENSE,
                    Transaction.expense_category == category,
                    Transaction.transaction_date >= transaction.transaction_date - timedelta(days=config.statistical_lookback_days)
                )
            ).all()

            if len(historical) < config.min_sample_size:
                return anomalies

            amounts = [abs(a[0]) for a in historical]
            sample_size = len(amounts)
            try:
                mean_amount = statistics.mean(amounts)
                std_amount = statistics.stdev(amounts) if len(amounts) > 1 else 0
            except statistics.StatisticsError:
                return anomalies

        if std_amount == 0:
            return anomalies

        # Z-score analysis
        z_score = abs((abs(transaction.amount) - mean_amount) / std_amount)

        if z_score > config.z_score_threshold:
            # Calculate anomaly score and confidence using unified strategy
            anomaly_score, confidence = AnomalyScoringStrategy.from_z_score(z_score, config.z_score_threshold)

            severity = AnomalyDetectionService._calculate_severity(anomaly_score)
            
            anomalies.append({
                "transaction_id": transaction.id,
                "anomaly_type": AnomalyType.STATISTICAL_OUTLIER,
                "severity": severity,
                "anomaly_score": anomaly_score,
                "confidence": confidence,
                "detection_method": "z_score",
                "reason": f"Transaction amount significantly deviates from historical pattern for {category.value}",
                "details": json.dumps({
                    "z_score": z_score,
                    "historical_mean": mean_amount,
                    "historical_std": std_amount,
                    "sample_size": sample_size
                }),
                "expected_value": mean_amount,
                "actual_value": abs(transaction.amount),
                "deviation_magnitude": z_score
            })
        
        return anomalies

    @staticmethod
    def _detect_temporal_anomalies(db: Session, transaction: Transaction, precomputed_stats: Optional[Dict] = None) -> List[Dict]:
        """Detect temporal anomalies (unusual timing patterns)"""
        anomalies = []
        config = AnomalyDetectionService._get_config(db) if not precomputed_stats else precomputed_stats['config']

        # Get day of week (0=Monday, 6=Sunday)
        weekday = transaction.transaction_date.weekday()

        # Weekend spending anomaly for certain categories
        essential_categories = [cat.value for cat in ExpenseCategory.get_essential_categories()]

        if (weekday >= 5 and  # Weekend
            transaction.transaction_type == TransactionType.EXPENSE and
            transaction.expense_category and
            transaction.expense_category.value in essential_categories and
            abs(transaction.amount) > config.weekend_essential_threshold):

            anomaly_score = config.default_temporal_anomaly_score
            confidence = config.default_temporal_confidence
            
            anomalies.append({
                "transaction_id": transaction.id,
                "anomaly_type": AnomalyType.TEMPORAL_ANOMALY,
                "severity": AnomalyDetectionService._calculate_severity(anomaly_score),
                "anomaly_score": anomaly_score,
                "confidence": confidence,
                "detection_method": "weekend_essential_spending",
                "reason": f"Large essential expense ({transaction.expense_category.value}) on weekend",
                "details": json.dumps({
                    "weekday": weekday,
                    "category": transaction.expense_category.value,
                    "amount": abs(transaction.amount)
                }),
                "expected_value": None,
                "actual_value": abs(transaction.amount),
                "deviation_magnitude": 1.0
            })
        
        return anomalies

    @staticmethod
    def _detect_amount_anomalies(db: Session, transaction: Transaction, precomputed_stats: Optional[Dict] = None) -> List[Dict]:
        """Detect amount-based anomalies"""
        anomalies = []
        config = AnomalyDetectionService._get_config(db) if not precomputed_stats else precomputed_stats['config']

        # Use precomputed global amounts if available
        if precomputed_stats and 'global_amounts' in precomputed_stats:
            amounts = precomputed_stats['global_amounts']
        else:
            # Fallback to individual query
            all_amounts = db.query(Transaction.amount).filter(
                and_(
                    Transaction.transaction_type == TransactionType.EXPENSE,
                    Transaction.transaction_date >= transaction.transaction_date - timedelta(days=config.amount_lookback_days)
                )
            ).all()
            amounts = [abs(a[0]) for a in all_amounts]

        if len(amounts) < config.min_amounts_for_percentile:
            return anomalies

        amounts = sorted(amounts)

        # Calculate percentiles from config
        high_value = np.percentile(amounts, config.high_percentile)
        critical_value = np.percentile(amounts, config.critical_percentile)

        transaction_amount = abs(transaction.amount)

        if transaction_amount > critical_value:
            anomaly_score = config.amount_p99_anomaly_score
            confidence = config.amount_p99_confidence
            severity = AnomalySeverity.HIGH
        elif transaction_amount > high_value:
            anomaly_score = config.amount_p95_anomaly_score
            confidence = config.amount_p95_confidence
            severity = AnomalySeverity.MEDIUM
        else:
            return anomalies

        # Build reason based on which percentile threshold was crossed
        high_pct = int(config.critical_percentile)
        medium_pct = int(config.high_percentile)
        tier = f"{100 - high_pct}%" if transaction_amount > critical_value else f"{100 - medium_pct}%"

        anomalies.append({
            "transaction_id": transaction.id,
            "anomaly_type": AnomalyType.AMOUNT_ANOMALY,
            "severity": severity,
            "anomaly_score": anomaly_score,
            "confidence": confidence,
            "detection_method": "percentile_analysis",
            "reason": f"Transaction amount in top {tier} of historical transactions",
            "details": json.dumps({
                "percentile_95": high_value,
                "percentile_99": critical_value,
                "sample_size": len(amounts)
            }),
            "expected_value": high_value,
            "actual_value": transaction_amount,
            "deviation_magnitude": transaction_amount / high_value
        })
        
        return anomalies

    @staticmethod
    def _detect_frequency_anomalies(db: Session, transaction: Transaction, precomputed_stats: Optional[Dict] = None) -> List[Dict]:
        """Detect frequency-based anomalies"""
        anomalies = []
        config = AnomalyDetectionService._get_config(db) if not precomputed_stats else precomputed_stats['config']

        # Only consider expenses
        if transaction.transaction_type != TransactionType.EXPENSE:
            return anomalies

        if not transaction.counterparty_account or not transaction.counterparty_account.strip():
            return anomalies

        merchant = transaction.counterparty_account

        # Note: Frequency detection uses per-transaction date lookback which is
        # complex to precompute correctly. Always use individual query for accuracy.
        merchant_transactions = db.query(Transaction).filter(
            and_(
                Transaction.counterparty_account == merchant,
                Transaction.transaction_type == TransactionType.EXPENSE,
                Transaction.transaction_date >= transaction.transaction_date - timedelta(days=config.frequency_lookback_days),
                Transaction.id != transaction.id
            )
        ).count()

        # If more than configured max transactions to same merchant in lookback period
        if merchant_transactions > config.max_merchant_frequency_30d:
            anomaly_score = config.default_frequency_anomaly_score
            confidence = config.default_frequency_confidence
            
            anomalies.append({
                "transaction_id": transaction.id,
                "anomaly_type": AnomalyType.FREQUENCY_ANOMALY,
                "severity": AnomalyDetectionService._calculate_severity(anomaly_score),
                "anomaly_score": anomaly_score,
                "confidence": confidence,
                "detection_method": "merchant_frequency",
                "reason": f"High frequency of transactions with {transaction.counterparty_account}",
                "details": json.dumps({
                    "merchant_account": transaction.counterparty_account,
                    "frequency_30_days": merchant_transactions + 1
                }),
                "expected_value": config.expected_normal_frequency,
                "actual_value": merchant_transactions + 1,
                "deviation_magnitude": (merchant_transactions + 1) / config.expected_normal_frequency
            })
        
        return anomalies

    @staticmethod
    def _detect_behavioral_anomalies(db: Session, transaction: Transaction, precomputed_stats: Optional[Dict] = None) -> List[Dict]:
        """Detect behavioral pattern anomalies"""
        anomalies = []
        config = AnomalyDetectionService._get_config(db) if not precomputed_stats else precomputed_stats['config']

        # Only analyze behavioral anomalies for expenses and expense categories
        if transaction.transaction_type != TransactionType.EXPENSE:
            return anomalies

        category = transaction.expense_category
        if not category:
            return anomalies

        # Use precomputed category usage if available. The precomputed total
        # includes the current transaction, so subtracting 1 yields the count of
        # *other* transactions in this category (matching the fallback query).
        precomputed_total = None
        if precomputed_stats and 'category_usage' in precomputed_stats:
            precomputed_total = precomputed_stats['category_usage'].get(category)

        if precomputed_total is not None:
            category_usage = precomputed_total - 1
        else:
            # Fallback to individual query (also guards the missing-key edge case)
            category_usage = db.query(Transaction).filter(
                and_(
                    Transaction.expense_category == category,
                    Transaction.transaction_type == TransactionType.EXPENSE,
                    Transaction.id != transaction.id
                )
            ).count()

        # New category usage
        if category_usage == 0:
            anomaly_score = config.default_behavioral_anomaly_score
            confidence = config.default_behavioral_confidence
            
            anomalies.append({
                "transaction_id": transaction.id,
                "anomaly_type": AnomalyType.BEHAVIORAL_ANOMALY,
                "severity": AnomalyDetectionService._calculate_severity(anomaly_score),
                "anomaly_score": anomaly_score,
                "confidence": confidence,
                "detection_method": "new_category_usage",
                "reason": f"First transaction in category: {category.value}",
                "details": json.dumps({
                    "category": category.value,
                    "first_usage": True
                }),
                "expected_value": None,
                "actual_value": abs(transaction.amount),
                "deviation_magnitude": 1.0
            })
        
        return anomalies

    @staticmethod
    def _detect_merchant_anomalies(db: Session, transaction: Transaction, precomputed_stats: Optional[Dict] = None) -> List[Dict]:
        """Detect merchant-related anomalies"""
        anomalies = []
        config = AnomalyDetectionService._get_config(db) if not precomputed_stats else precomputed_stats['config']

        # Only consider expenses
        if transaction.transaction_type != TransactionType.EXPENSE:
            return anomalies

        if not transaction.counterparty_account or not transaction.counterparty_account.strip():
            return anomalies

        merchant = transaction.counterparty_account

        # Use precomputed merchant history if available. The precomputed total
        # includes the current transaction, so subtracting 1 yields the count of
        # *other* transactions for this merchant (matching the fallback query).
        precomputed_total = None
        if precomputed_stats and 'merchant_history' in precomputed_stats:
            precomputed_total = precomputed_stats['merchant_history'].get(merchant)

        if precomputed_total is not None:
            merchant_history = precomputed_total - 1
        else:
            # Fallback to individual query (also guards the missing-key edge case)
            merchant_history = db.query(Transaction).filter(
                and_(
                    Transaction.counterparty_account == merchant,
                    Transaction.transaction_type == TransactionType.EXPENSE,
                    Transaction.id != transaction.id
                )
            ).count()

        # New merchant account with large amount - use configured threshold.
        # Score scales with how far the amount exceeds the threshold.
        large_amount_threshold = config.merchant_large_amount_threshold
        if merchant_history == 0 and abs(transaction.amount) > large_amount_threshold:
            amount_ratio = abs(transaction.amount) / large_amount_threshold
            base_score = config.amount_p95_anomaly_score
            anomaly_score = min(100, base_score + (amount_ratio - 1) * 10)
            confidence = min(0.95, 0.8 + (amount_ratio - 1) * 0.05)
            
            anomalies.append({
                "transaction_id": transaction.id,
                "anomaly_type": AnomalyType.MERCHANT_ANOMALY,
                "severity": AnomalyDetectionService._calculate_severity(anomaly_score),
                "anomaly_score": anomaly_score,
                "confidence": confidence,
                "detection_method": "new_merchant_large_amount",
                "reason": f"First transaction with new merchant account: {transaction.counterparty_account}",
                "details": json.dumps({
                    "merchant_account": transaction.counterparty_account,
                    "first_transaction": True,
                    "amount": abs(transaction.amount)
                }),
                "expected_value": None,
                "actual_value": abs(transaction.amount),
                "deviation_magnitude": 1.0
            })
        
        return anomalies

    @staticmethod
    def _calculate_severity(anomaly_score: float) -> AnomalySeverity:
        """Calculate severity based on anomaly score"""
        for severity, (min_score, max_score) in AnomalyDetectionService.SEVERITY_THRESHOLDS.items():
            if min_score <= anomaly_score < max_score:
                return severity
        return AnomalySeverity.CRITICAL if anomaly_score >= 95 else AnomalySeverity.LOW

    @staticmethod
    def _precompute_statistics(db: Session, transactions: List[Transaction]) -> Dict:
        """Pre-compute all statistics needed for anomaly detection to avoid N+1 queries.

        All aggregates are computed with a small, fixed number of bulk queries
        (independent of the number of categories/merchants in the batch).

        Returns a dictionary with:
        - category_stats: Dict[category, Dict with mean, std, count]
        - global_amounts: List of all expense amounts (for percentile analysis)
        - category_usage: Dict[category, total expense count] (includes current batch)
        - merchant_history: Dict[merchant_account, total expense count] (includes current batch)
        - config: the active AnomalyConfig
        """
        config = AnomalyDetectionService._get_config(db)
        # Always include config so callers can rely on precomputed_stats['config']
        if not transactions:
            return {'config': config}

        # Get date range for all transactions
        min_date = min(t.transaction_date for t in transactions)
        max_date = max(t.transaction_date for t in transactions)

        # Compute lookback start dates
        stat_lookback_start = min_date - timedelta(days=config.statistical_lookback_days)
        amount_lookback_start = min_date - timedelta(days=config.amount_lookback_days)

        categories = set(t.expense_category for t in transactions if t.expense_category)
        merchant_accounts = set(
            t.counterparty_account for t in transactions
            if t.counterparty_account and t.counterparty_account.strip()
        )

        # 1. Category statistics: single query for all relevant categories, grouped in Python
        category_stats = {}
        if categories:
            rows = db.query(
                Transaction.expense_category, Transaction.amount
            ).filter(
                and_(
                    Transaction.transaction_type == TransactionType.EXPENSE,
                    Transaction.expense_category.in_(categories),
                    Transaction.transaction_date >= stat_lookback_start,
                    Transaction.transaction_date < min_date  # Exclude current batch
                )
            ).all()

            amounts_by_category: Dict = defaultdict(list)
            for category, amount in rows:
                amounts_by_category[category].append(abs(amount))

            for category, amounts in amounts_by_category.items():
                if len(amounts) < config.min_sample_size:
                    continue
                try:
                    mean_value = statistics.mean(amounts)
                    std_value = statistics.stdev(amounts) if len(amounts) > 1 else 0
                except statistics.StatisticsError:
                    continue
                category_stats[category] = {
                    'mean': mean_value,
                    'std': std_value,
                    'count': len(amounts)
                }

        # 2. Global amounts for percentile analysis (single query)
        all_amounts_query = db.query(Transaction.amount).filter(
            and_(
                Transaction.transaction_type == TransactionType.EXPENSE,
                Transaction.transaction_date >= amount_lookback_start,
                Transaction.transaction_date < max_date  # Include current batch for percentiles
            )
        ).all()
        global_amounts = [abs(a[0]) for a in all_amounts_query]

        # 3. Total merchant history counts (single grouped query). Includes current batch.
        merchant_history = {}
        if merchant_accounts:
            merchant_rows = db.query(
                Transaction.counterparty_account, func.count(Transaction.id)
            ).filter(
                and_(
                    Transaction.counterparty_account.in_(merchant_accounts),
                    Transaction.transaction_type == TransactionType.EXPENSE
                )
            ).group_by(Transaction.counterparty_account).all()
            merchant_history = {acct: count for acct, count in merchant_rows}

        # 4. Total category usage counts (single grouped query). Includes current batch.
        category_usage = {}
        if categories:
            usage_rows = db.query(
                Transaction.expense_category, func.count(Transaction.id)
            ).filter(
                and_(
                    Transaction.expense_category.in_(categories),
                    Transaction.transaction_type == TransactionType.EXPENSE
                )
            ).group_by(Transaction.expense_category).all()
            category_usage = {cat: count for cat, count in usage_rows}

        return {
            'category_stats': category_stats,
            'global_amounts': global_amounts,
            'merchant_history': merchant_history,
            'category_usage': category_usage,
            'config': config
        }

    @staticmethod
    def _update_patterns(db: Session, transactions: List[Transaction]):
        """Update anomaly patterns based on transaction data"""
        # This would update the AnomalyPattern table with learned patterns
        # Implementation can be expanded based on needs
        pass

    @staticmethod
    def get_anomaly_statistics(db: Session) -> Dict:
        """Get overall anomaly statistics"""
        total = db.query(TransactionAnomaly).count()
        unreviewed = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.status == AnomalyStatus.DETECTED
        ).count()
        confirmed = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.status == AnomalyStatus.CONFIRMED
        ).count()
        false_positives = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.status == AnomalyStatus.FALSE_POSITIVE
        ).count()
        
        # Count by type
        type_counts = db.query(
            TransactionAnomaly.anomaly_type,
            func.count(TransactionAnomaly.id)
        ).group_by(TransactionAnomaly.anomaly_type).all()
        
        # Count by severity
        severity_counts = db.query(
            TransactionAnomaly.severity,
            func.count(TransactionAnomaly.id)
        ).group_by(TransactionAnomaly.severity).all()
        
        # Calculate accuracy
        reviewed_total = confirmed + false_positives
        accuracy = (confirmed / reviewed_total * 100) if reviewed_total > 0 else 0
        
        return {
            "total_anomalies": total,
            "unreviewed_anomalies": unreviewed,
            "confirmed_anomalies": confirmed,
            "false_positives": false_positives,
            "anomalies_by_type": {t.value: c for t, c in type_counts},
            "anomalies_by_severity": {s.value: c for s, c in severity_counts},
            "detection_accuracy": accuracy
        }

    @staticmethod
    def update_anomaly_status(
        db: Session, 
        anomaly_id: int, 
        status: AnomalyStatus,
        review_notes: Optional[str] = None
    ) -> TransactionAnomaly:
        """Update anomaly review status"""
        anomaly = db.query(TransactionAnomaly).filter(
            TransactionAnomaly.id == anomaly_id
        ).first()
        
        if not anomaly:
            raise ValueError("Anomaly not found")
        
        anomaly.status = status
        anomaly.reviewed_at = datetime.now(timezone.utc)
        anomaly.review_notes = review_notes
        
        db.commit()
        db.refresh(anomaly)
        
        return anomaly
