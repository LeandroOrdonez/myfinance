from pydantic import BaseModel, validator
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from enum import Enum
from ..models.anomaly import AnomalyType, AnomalySeverity, AnomalyStatus

class AnomalyBase(BaseModel):
    transaction_id: int
    anomaly_type: AnomalyType
    severity: AnomalySeverity
    anomaly_score: float
    confidence: float
    detection_method: str
    reason: str
    details: Optional[str] = None
    expected_value: Optional[float] = None
    actual_value: Optional[float] = None
    deviation_magnitude: Optional[float] = None

class AnomalyCreate(AnomalyBase):
    pass

class AnomalyUpdate(BaseModel):
    status: Optional[AnomalyStatus] = None
    review_notes: Optional[str] = None

class Anomaly(AnomalyBase):
    id: int
    status: AnomalyStatus
    detection_timestamp: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None

    class Config:
        orm_mode = True

class AnomalyWithTransaction(Anomaly):
    transaction: Optional[Dict[str, Any]] = None

class AnomalyPatternBase(BaseModel):
    pattern_type: str
    pattern_key: str
    mean_value: Optional[float] = None
    std_deviation: Optional[float] = None
    median_value: Optional[float] = None
    percentile_95: Optional[float] = None
    percentile_99: Optional[float] = None
    typical_days: Optional[str] = None
    typical_hours: Optional[str] = None
    avg_frequency_days: Optional[float] = None
    min_frequency_days: Optional[float] = None
    max_frequency_days: Optional[float] = None
    sample_size: int

class AnomalyPatternCreate(AnomalyPatternBase):
    pass

class AnomalyPattern(AnomalyPatternBase):
    id: int
    last_updated: datetime
    created_at: datetime

    class Config:
        orm_mode = True

class AnomalyRuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    rule_type: AnomalyType
    category_filter: Optional[str] = None
    merchant_filter: Optional[str] = None
    amount_threshold: Optional[float] = None
    frequency_threshold: Optional[int] = None
    time_period_days: int = 30
    is_active: bool = True
    severity_override: Optional[AnomalySeverity] = None

class AnomalyRuleCreate(AnomalyRuleBase):
    pass

class AnomalyRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    amount_threshold: Optional[float] = None
    frequency_threshold: Optional[int] = None
    severity_override: Optional[AnomalySeverity] = None

class AnomalyRule(AnomalyRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class AnomalyDetectionRequest(BaseModel):
    transaction_ids: Optional[List[int]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    force_redetection: bool = False

class AnomalyDetectionResult(BaseModel):
    total_transactions_analyzed: int
    anomalies_detected: int
    anomalies_by_type: Dict[str, int]
    anomalies_by_severity: Dict[str, int]
    processing_time_seconds: float

class AnomalyStatistics(BaseModel):
    total_anomalies: int
    unreviewed_anomalies: int
    confirmed_anomalies: int
    false_positives: int
    anomalies_by_type: Dict[str, int]
    anomalies_by_severity: Dict[str, int]
    detection_accuracy: float  # Percentage of confirmed vs total reviewed

class AnomalyPage(BaseModel):
    items: List[AnomalyWithTransaction]
    total: int
    page: int
    page_size: int
    total_pages: int

    class Config:
        orm_mode = True
