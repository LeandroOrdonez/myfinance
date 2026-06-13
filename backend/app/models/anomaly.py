from sqlalchemy import Column, Integer, String, Float, Date, Enum, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship, Session, validates
from ..database import Base
import enum
from datetime import datetime, timezone


def _utcnow() -> datetime:
    """Timezone-aware UTC now (replacement for deprecated datetime.utcnow)."""
    return datetime.now(timezone.utc)

class AnomalyType(enum.Enum):
    STATISTICAL_OUTLIER = "Statistical Outlier"
    TEMPORAL_ANOMALY = "Temporal Anomaly"
    AMOUNT_ANOMALY = "Amount Anomaly"
    FREQUENCY_ANOMALY = "Frequency Anomaly"
    BEHAVIORAL_ANOMALY = "Behavioral Anomaly"
    MERCHANT_ANOMALY = "Merchant Anomaly"

class AnomalySeverity(enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class AnomalyStatus(enum.Enum):
    DETECTED = "Detected"
    REVIEWED = "Reviewed"
    CONFIRMED = "Confirmed"
    FALSE_POSITIVE = "False Positive"
    IGNORED = "Ignored"

class TransactionAnomaly(Base):
    __tablename__ = "transaction_anomalies"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    anomaly_type = Column(Enum(AnomalyType), nullable=False)
    severity = Column(Enum(AnomalySeverity), nullable=False)
    status = Column(Enum(AnomalyStatus), default=AnomalyStatus.DETECTED)
    
    # Scoring and confidence
    anomaly_score = Column(Float, nullable=False)  # 0-100 scale
    confidence = Column(Float, nullable=False)     # 0-1 scale
    
    # Detection details
    detection_method = Column(String(100), nullable=False)
    detection_timestamp = Column(DateTime, default=_utcnow)
    
    # Anomaly explanation
    reason = Column(Text, nullable=False)
    details = Column(Text)  # JSON string with additional details
    
    # Statistical metrics
    expected_value = Column(Float)  # Expected value for comparison
    actual_value = Column(Float)    # Actual value that triggered anomaly
    deviation_magnitude = Column(Float)  # How far from expected (in std devs or similar)
    
    # Review information
    reviewed_at = Column(DateTime)
    reviewed_by = Column(String(100))  # Could be user ID in future
    review_notes = Column(Text)
    
    # Relationship to transaction
    transaction = relationship("Transaction", backref="anomalies", passive_deletes=True)

class AnomalyPattern(Base):
    """Store learned patterns to improve detection accuracy"""
    __tablename__ = "anomaly_patterns"
    
    id = Column(Integer, primary_key=True, index=True)
    pattern_type = Column(String(50), nullable=False)  # e.g., "merchant_spending", "category_timing"
    pattern_key = Column(String(200), nullable=False)  # e.g., merchant name, category
    
    # Pattern statistics
    mean_value = Column(Float)
    std_deviation = Column(Float)
    median_value = Column(Float)
    percentile_95 = Column(Float)
    percentile_99 = Column(Float)
    
    # Temporal patterns
    typical_days = Column(String(20))  # JSON array of typical days (0-6)
    typical_hours = Column(String(50))  # JSON array of typical hours (0-23)
    
    # Frequency patterns
    avg_frequency_days = Column(Float)  # Average days between transactions
    min_frequency_days = Column(Float)
    max_frequency_days = Column(Float)
    
    # Pattern metadata
    sample_size = Column(Integer, nullable=False)
    last_updated = Column(DateTime, default=_utcnow)
    created_at = Column(DateTime, default=_utcnow)

class AnomalyRule(Base):
    """User-defined rules for anomaly detection"""
    __tablename__ = "anomaly_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)

    # Rule conditions
    rule_type = Column(Enum(AnomalyType), nullable=False)
    category_filter = Column(String(50))  # Optional category to apply rule to
    merchant_filter = Column(String(200))  # Optional merchant pattern

    # Thresholds
    amount_threshold = Column(Float)
    frequency_threshold = Column(Integer)  # Max transactions per period
    time_period_days = Column(Integer, default=30)

    # Rule settings
    is_active = Column(Boolean, default=True)
    severity_override = Column(Enum(AnomalySeverity))

    # Metadata
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow)


class AnomalyConfig(Base):
    """Configuration thresholds for anomaly detection algorithms"""
    __tablename__ = "anomaly_config"

    id = Column(Integer, primary_key=True, index=True)

    # Statistical detection thresholds
    z_score_threshold = Column(Float, nullable=False, default=2.0)
    min_sample_size = Column(Integer, nullable=False, default=10)

    # Amount detection thresholds
    high_percentile = Column(Float, nullable=False, default=95.0)
    critical_percentile = Column(Float, nullable=False, default=99.0)
    min_amounts_for_percentile = Column(Integer, nullable=False, default=20)

    # Frequency detection thresholds
    max_merchant_frequency_30d = Column(Integer, nullable=False, default=10)
    expected_normal_frequency = Column(Integer, nullable=False, default=5)

    # Temporal detection thresholds
    weekend_essential_threshold = Column(Float, nullable=False, default=100.0)

    # Merchant anomaly thresholds
    new_merchant_large_threshold_days = Column(Integer, nullable=False, default=90)
    new_merchant_min_transaction_count = Column(Integer, nullable=False, default=3)
    merchant_large_amount_threshold = Column(Float, nullable=False, default=200.0)

    # Time windows (days)
    statistical_lookback_days = Column(Integer, nullable=False, default=365)
    amount_lookback_days = Column(Integer, nullable=False, default=365)
    frequency_lookback_days = Column(Integer, nullable=False, default=30)

    # Anomaly score defaults (when not calculated statistically)
    default_behavioral_anomaly_score = Column(Float, nullable=False, default=60.0)
    default_temporal_anomaly_score = Column(Float, nullable=False, default=65.0)
    default_frequency_anomaly_score = Column(Float, nullable=False, default=70.0)
    amount_p95_anomaly_score = Column(Float, nullable=False, default=75.0)
    amount_p99_anomaly_score = Column(Float, nullable=False, default=90.0)

    # Confidence defaults
    default_behavioral_confidence = Column(Float, nullable=False, default=0.6)
    default_temporal_confidence = Column(Float, nullable=False, default=0.6)
    default_frequency_confidence = Column(Float, nullable=False, default=0.7)
    amount_p95_confidence = Column(Float, nullable=False, default=0.75)
    amount_p99_confidence = Column(Float, nullable=False, default=0.85)

    # Default detection range
    default_detection_days = Column(Integer, nullable=False, default=90)

    # Metadata
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    # Fields constrained to the 0-100 percentile / score range
    _PERCENTAGE_FIELDS = {
        "high_percentile", "critical_percentile",
        "default_behavioral_anomaly_score", "default_temporal_anomaly_score",
        "default_frequency_anomaly_score", "amount_p95_anomaly_score",
        "amount_p99_anomaly_score",
    }
    # Confidence fields constrained to the 0-1 range
    _CONFIDENCE_FIELDS = {
        "default_behavioral_confidence", "default_temporal_confidence",
        "default_frequency_confidence", "amount_p95_confidence",
        "amount_p99_confidence",
    }
    # Fields that must be strictly positive
    _POSITIVE_FIELDS = {
        "z_score_threshold", "min_sample_size", "min_amounts_for_percentile",
        "max_merchant_frequency_30d", "expected_normal_frequency",
        "weekend_essential_threshold", "new_merchant_large_threshold_days",
        "new_merchant_min_transaction_count", "merchant_large_amount_threshold",
        "statistical_lookback_days", "amount_lookback_days",
        "frequency_lookback_days", "default_detection_days",
    }

    @validates(
        "high_percentile", "critical_percentile",
        "default_behavioral_anomaly_score", "default_temporal_anomaly_score",
        "default_frequency_anomaly_score", "amount_p95_anomaly_score",
        "amount_p99_anomaly_score",
        "default_behavioral_confidence", "default_temporal_confidence",
        "default_frequency_confidence", "amount_p95_confidence",
        "amount_p99_confidence",
        "z_score_threshold", "min_sample_size", "min_amounts_for_percentile",
        "max_merchant_frequency_30d", "expected_normal_frequency",
        "weekend_essential_threshold", "new_merchant_large_threshold_days",
        "new_merchant_min_transaction_count", "merchant_large_amount_threshold",
        "statistical_lookback_days", "amount_lookback_days",
        "frequency_lookback_days", "default_detection_days",
    )
    def _validate_config_value(self, key, value):
        if value is None:
            raise ValueError(f"{key} cannot be None")
        if key in self._PERCENTAGE_FIELDS and not 0 <= value <= 100:
            raise ValueError(f"{key} must be between 0 and 100, got {value}")
        if key in self._CONFIDENCE_FIELDS and not 0 <= value <= 1:
            raise ValueError(f"{key} must be between 0 and 1, got {value}")
        if key in self._POSITIVE_FIELDS and value <= 0:
            raise ValueError(f"{key} must be positive, got {value}")
        return value

    @classmethod
    def get_or_create_default(cls, db: Session) -> "AnomalyConfig":
        """Get existing config or create default.

        Uses flush (not commit) so the caller's transaction boundary is
        preserved. The created row participates in the caller's transaction.
        """
        config = db.query(cls).first()
        if not config:
            config = cls()
            db.add(config)
            db.flush()
            db.refresh(config)
        return config
