import React from 'react';
import { ForecastProvenance } from '../../../types/projections';

export const ForecastStatus: React.FC<{ provenance?: ForecastProvenance; label?: string }> = ({ provenance, label }) => {
  const status = provenance?.status ?? 'unverified';
  const names = { current: 'Current', out_of_date: 'Out of date', unverified: 'Unverified' };
  const time = provenance?.calculated_at ? new Date(provenance.calculated_at) : null;
  const validTime = time && Number.isFinite(time.getTime());
  return (
    <div role="status" className={`text-sm ${status === 'current' ? 'text-gray-600 dark:text-gray-400' : 'p-3 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200'}`}>
      <p><strong className="font-medium">{label ? `${label}: ` : ''}{names[status]}</strong>{validTime && <> · Calculated <time dateTime={provenance!.calculated_at!}>{time.toLocaleString()}</time></>}</p>
      {status === 'unverified' && <p>Recalculate to verify this saved forecast’s assumptions and source data.</p>}
      {status === 'out_of_date' && <p>{provenance?.reasons.join(' ')} Recalculate before relying on this forecast.</p>}
      {provenance?.cash_balance_known === false && <p>No opening cash balance was recorded; this calculation starts with zero cash.</p>}
    </div>
  );
};
