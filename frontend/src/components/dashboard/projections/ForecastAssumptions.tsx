import React from 'react';
import { ForecastProvenance, ProjectionScenario } from '../../../types/projections';
import { PARAMETER_HELP } from './ParameterEditor';

interface Props {
  scenario: ProjectionScenario;
  provenance?: ForecastProvenance;
  formatCurrency: (value: number | undefined) => string;
}

export const ForecastAssumptions: React.FC<Props> = ({ scenario, provenance, formatCurrency }) => {
  const current = Object.fromEntries((scenario.parameters ?? []).map(p => [p.param_name, p.param_value]));
  const used = provenance?.assumptions ?? {};
  const keys = Array.from(new Set([...Object.keys(used), ...Object.keys(current)]));
  const format = (key: string, value: number | undefined) => value === undefined ? 'Unknown' : key === 'holdings_market_value'
    ? formatCurrency(value) : key === 'emergency_fund_target' ? `${value} months` : `${Number((value * 100).toFixed(3))}%`;
  return (
    <details className="border-t border-gray-200 dark:border-gray-700 pt-2">
      <summary className="cursor-pointer min-h-11 py-2 text-sm font-medium">Assumptions for {scenario.name}</summary>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 break-words">{scenario.description}</p>
      <table className="w-full table-fixed text-sm text-left">
        <caption className="text-left text-gray-600 dark:text-gray-400 mb-3">Calculated values use the saved assumptions, not unsaved or later edits.</caption>
        <thead><tr className="border-b dark:border-gray-700"><th scope="col" className="w-1/2 py-2 pr-2">Assumption</th><th scope="col" className="py-2 pr-2">Calculated</th><th scope="col" className="py-2">Current</th></tr></thead>
        <tbody>{keys.map(key => (
          <tr key={key} className="border-b border-gray-100 dark:border-gray-800 align-top">
            <th scope="row" className="py-3 pr-2 font-normal break-words">{PARAMETER_HELP[key]?.label ?? key.replace(/_/g, ' ')}</th>
            <td className="py-3 pr-2 tabular-nums break-words">{format(key, used[key])}</td>
            <td className="py-3 tabular-nums break-words">{format(key, current[key])}{used[key] !== undefined && current[key] !== used[key] && <span className="block text-xs text-amber-800 dark:text-amber-200">Changed</span>}</td>
          </tr>
        ))}</tbody>
      </table>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">Net worth is cash plus investments. Monthly portfolio returns are applied before new contributions. Contributions are limited to surplus after spending and the emergency cash reserve. Spending deficits reduce cash; automatic investment sales, borrowing interest and taxes are not modeled.</p>
      {provenance?.starting_cash != null && <p className="text-sm mt-2">Opening cash used: {formatCurrency(provenance.starting_cash)}</p>}
      {scenario.is_base_scenario && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Calculating retains manual assumptions. Refresh from transactions explicitly to replace the base scenario’s growth and allocation assumptions.</p>}
    </details>
  );
};
