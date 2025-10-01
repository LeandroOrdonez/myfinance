from sqlalchemy import Column, Integer, String, Float, Date, Enum, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base
import enum
from datetime import datetime

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
    detection_timestamp = Column(DateTime, default=datetime.utcnow)
    
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
    last_updated = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
