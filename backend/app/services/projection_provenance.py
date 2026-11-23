import hashlib
import json
from datetime import timezone
from enum import Enum
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.financial_health import FinancialHealth
from ..models.financial_projection import HoldingsValueHistory, ProjectionCalculation, ProjectionParameter
from ..models.statistics import FinancialStatistics
from ..models.transaction import Transaction

MODEL_VERSION = "cash-portfolio-v2"


def parameter_values(db: Session, scenario_id: int) -> dict[str, float]:
    return {p.param_name: p.param_value for p in db.query(ProjectionParameter).filter_by(scenario_id=scenario_id).all()}


def source_version(db: Session) -> str:
    digest = hashlib.sha256()
    for model in (Transaction, FinancialStatistics, FinancialHealth, HoldingsValueHistory):
        digest.update(model.__tablename__.encode())
        for row in db.execute(select(*model.__table__.columns).order_by(model.id)):
            encoded = json.dumps(list(row), default=lambda value: value.value if isinstance(value, Enum) else str(value),
                                 sort_keys=True, allow_nan=False, separators=(",", ":"))
            digest.update(encoded.encode())
            digest.update(b"\n")
    return digest.hexdigest()


def get_provenance(db: Session, scenario_id: int, current_source: str | None = None) -> dict[str, Any]:
    run = db.get(ProjectionCalculation, scenario_id)
    if run is None:
        return {"status": "unverified", "calculated_at": None, "assumptions": {},
                "reasons": ["This forecast predates calculation tracking. Recalculate to verify it."]}
    reasons = []
    if parameter_values(db, scenario_id) != run.parameters:
        reasons.append("Scenario assumptions have changed.")
    if (current_source or source_version(db)) != run.source_version:
        reasons.append("Financial source data has changed.")
    if run.model_version != MODEL_VERSION:
        reasons.append("The forecasting model has changed.")
    calculated_at = run.calculated_at.replace(tzinfo=timezone.utc)
    return {"status": "out_of_date" if reasons else "current", "calculated_at": calculated_at.isoformat(),
            "assumptions": run.assumptions, "source_version": run.source_version,
            "model_version": run.model_version, "time_horizon": run.time_horizon,
            "starting_cash": run.starting_cash, "cash_balance_known": run.cash_balance_known,
            "reasons": reasons}
