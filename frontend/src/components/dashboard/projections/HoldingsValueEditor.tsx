import React, { useEffect, useState } from 'react';
import { updateHoldingsMarketValue } from '../../../services/projectionService';
import { usePrivacyMode } from '../../../contexts/PrivacyContext';
import { PRIVACY_MASK } from '../../../utils/formatPrivateAmount';

interface HoldingsValueEditorProps {
  value: number;
  disabled: boolean;
  onSaved: () => void;
}

export const HoldingsValueEditor: React.FC<HoldingsValueEditorProps> = ({ value, disabled, onSaved }) => {
  const { privacyMode } = usePrivacyMode();
  const [holdingsValue, setHoldingsValue] = useState(String(value));
  const [isSavingHoldings, setIsSavingHoldings] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Sync the holdings input when scenarios change
  useEffect(() => { setHoldingsValue(String(value)); }, [value]);
  useEffect(() => { setIsEditing(false); }, [privacyMode]);

  // Handle updating the shared holdings market value for all scenarios
  const handleUpdateHoldingsValue = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSavingHoldings) return;
    const amount = Number(holdingsValue);
    if (!holdingsValue.trim() || !Number.isFinite(amount) || amount < 0 || amount > 1e12) {
      setError('Enter a value between 0 and 1,000,000,000,000 euros.');
      return;
    }
    try {
      setIsSavingHoldings(true);
      setError(null);
      setSaved(false);
      await updateHoldingsMarketValue(amount);
      setIsEditing(false);
      setSaved(true);
      onSaved();
    } catch {
      setError('Could not update holdings. Your entry has been kept. Try applying it again.');
    } finally {
      setIsSavingHoldings(false);
    }
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3" aria-labelledby="holdings-heading">
      <div>
        <h3 id="holdings-heading" className="font-medium">Investment holdings</h3>
        <p id="holdings-help" className="text-sm text-gray-600 dark:text-gray-400 mt-1">Current market value of your investments, shared by all scenarios. Recalculate forecasts after applying changes.</p>
      </div>
      {privacyMode && !isEditing ? (
        <div className="flex flex-wrap items-center gap-3">
          <span>{PRIVACY_MASK}</span>
          <button type="button" disabled={disabled} onClick={() => { setIsEditing(true); setSaved(false); }} className="min-h-11 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50">Reveal holdings to edit</button>
        </div>
      ) : (
        <form onSubmit={handleUpdateHoldingsValue} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="holdings-market-value" className="block text-sm font-medium">Holdings market value (€)</label>
            <input id="holdings-market-value" aria-describedby="holdings-help" aria-invalid={Boolean(error)} type="number" required min="0" max="1000000000000" step="0.01" value={holdingsValue} disabled={isSavingHoldings || disabled} onChange={e => { setHoldingsValue(e.target.value); setSaved(false); setError(null); }} className="w-44 max-w-full min-h-11 px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700" />
          </div>
          <button type="submit" disabled={isSavingHoldings || disabled} className="min-h-11 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">{isSavingHoldings ? 'Applying…' : 'Apply to all scenarios'}</button>
          {privacyMode && <button type="button" disabled={isSavingHoldings} onClick={() => { setIsEditing(false); setHoldingsValue(String(value)); setError(null); }} className="min-h-11 px-3 py-2 text-sm underline underline-offset-4">Cancel and hide</button>}
        </form>
      )}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      {saved && <p role="status" className="text-sm text-green-800 dark:text-green-300">Holdings updated for all scenarios. Recalculate to refresh their forecasts.</p>}
    </section>
  );
};
