import React, { useState, useEffect, useId } from 'react';
import { ProjectionParameterCreate } from '../../../types/projections';

interface ParameterEditorProps {
  parameters: ProjectionParameterCreate[];
  onChange: (parameters: ProjectionParameterCreate[]) => void;
  onValidityChange?: (valid: boolean) => void;
}

// Validation bounds for projection parameters (must match backend)
const PARAMETER_BOUNDS: Record<string, { min: number; max: number; displayMin: number; displayMax: number }> = {
  income_growth_rate: { min: -0.80, max: 0.80, displayMin: -80, displayMax: 80 },
  essential_expenses_growth_rate: { min: -0.80, max: 0.80, displayMin: -80, displayMax: 80 },
  discretionary_expenses_growth_rate: { min: -0.80, max: 0.80, displayMin: -80, displayMax: 80 },
  investment_rate: { min: 0.0, max: 0.90, displayMin: 0, displayMax: 90 },
  inflation_rate: { min: -0.10, max: 0.30, displayMin: -10, displayMax: 30 },
  investment_return_rate: { min: -0.80, max: 0.80, displayMin: -80, displayMax: 80 },
  emergency_fund_target: { min: 0.0, max: 36.0, displayMin: 0, displayMax: 36 },
  holdings_market_value: { min: 0.0, max: 1e12, displayMin: 0, displayMax: 1e12 },
};

export const PARAMETER_HELP: Record<string, { label: string; help: string; group: string }> = {
  income_growth_rate: { label: 'Annual income growth', help: 'Expected yearly change in your income.', group: 'Income' },
  essential_expenses_growth_rate: { label: 'Annual essential spending growth', help: 'Expected yearly change in essential expenses.', group: 'Spending' },
  discretionary_expenses_growth_rate: { label: 'Annual discretionary spending growth', help: 'Expected yearly change in non-essential expenses.', group: 'Spending' },
  investment_rate: { label: 'Income invested', help: 'Target share of income invested, limited to surplus after spending and the emergency cash reserve.', group: 'Investing' },
  investment_return_rate: { label: 'Annual investment return', help: 'Assumed annual portfolio return, compounded monthly before new contributions. Gains and losses affect net worth.', group: 'Investing' },
  inflation_rate: { label: 'Annual inflation', help: 'Used to express future values in purchasing power at the forecast’s starting month.', group: 'Inflation & reserves' },
  emergency_fund_target: { label: 'Emergency fund target', help: 'Months of essential spending to hold in cash before making new investment contributions.', group: 'Inflation & reserves' },
};

const ParameterEditor: React.FC<ParameterEditorProps> = ({ parameters, onChange, onValidityChange }) => {
  // State to track input values separately from parameter values
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  // State to track validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});
  const id = useId();

  // Initialize input values without clearing other drafts when parameters change
  useEffect(() => {
    setInputValues(current => Object.fromEntries(parameters.map(param => [
      param.param_name,
      current[param.param_name] ?? String(param.param_type === 'percentage' ? Number((param.param_value * 100).toPrecision(12)) : param.param_value),
    ])));
  }, [parameters]);

  // Format parameter name for display
  const formatParamName = (name: string) => PARAMETER_HELP[name]?.label ?? name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Handle input value change and preserve invalid drafts
  const handleInputChange = (index: number, value: string) => {
    const param = parameters[index];
    setInputValues(current => ({ ...current, [param.param_name]: value }));
    commitValue(index, value);
  };

  // Validate a parameter value against its bounds
  const validateValue = (paramName: string, value: string, isPercentage: boolean): string | null => {
    if (!value.trim() || !Number.isFinite(Number(value))) return 'Enter a finite number.';
    const bounds = PARAMETER_BOUNDS[paramName];
    if (!bounds) return null;
    
    // For percentage types, compare against display bounds (user enters %, we store decimal)
    const minBound = isPercentage ? bounds.displayMin : bounds.min;
    const maxBound = isPercentage ? bounds.displayMax : bounds.max;
    if (Number(value) < minBound || Number(value) > maxBound) return `Must be between ${minBound} and ${maxBound}.`;
    return null;
  };

  const commitValue = (index: number, value: string) => {
    const param = parameters[index];
    // Validate the input value
    const error = validateValue(param.param_name, value, param.param_type === 'percentage');
    setValidationErrors(current => ({ ...current, [param.param_name]: error }));
    // If there's an error, preserve the draft instead of clamping it
    if (error) return;
    // Convert percentage inputs back to decimal form for storage
    const parsedValue = Number(value) / (param.param_type === 'percentage' ? 100 : 1);
    if (parsedValue !== param.param_value) {
      onChange(parameters.map((item, i) => i === index ? { ...item, param_value: parsedValue } : item));
    }
  };

  // Handle blur event to validate the actual parameter value
  const handleInputBlur = (index: number) => {
    const param = parameters[index];
    // Retain an invalid value until the user corrects it
    commitValue(index, inputValues[param.param_name] ?? '');
    // Keep the error visible after validation
  };

  // Get suffix for parameter type
  const getValueSuffix = (type: string) => {
    switch (type) {
      case 'percentage': return '%';
      case 'months': return 'months';
      case 'amount': return '€';
      default: return '';
    }
  };

  const isValid = parameters.every(param => param.param_name === 'holdings_market_value' || !validateValue(
    param.param_name,
    inputValues[param.param_name] ?? String(param.param_type === 'percentage' ? param.param_value * 100 : param.param_value),
    param.param_type === 'percentage'
  ));
  useEffect(() => { onValidityChange?.(isValid); }, [isValid, onValidityChange]);

  const groups = Array.from(new Set(parameters.filter(param => param.param_name !== 'holdings_market_value')
    .map(param => PARAMETER_HELP[param.param_name]?.group ?? 'Other assumptions')));
  const renderGroup = (group: string) => (
    <fieldset className="space-y-4 min-w-0" key={group}>
      <legend className="font-medium mb-3">{group}</legend>
      {parameters.map((param, index) => {
        // Holdings market value is managed globally for all scenarios
        if (param.param_name === 'holdings_market_value' || (PARAMETER_HELP[param.param_name]?.group ?? 'Other assumptions') !== group) return null;
        const bounds = PARAMETER_BOUNDS[param.param_name];
        const minVal = bounds ? (param.param_type === 'percentage' ? bounds.displayMin : bounds.min) : undefined;
        const maxVal = bounds ? (param.param_type === 'percentage' ? bounds.displayMax : bounds.max) : undefined;
        const error = validationErrors[param.param_name];
        const inputId = `${id}-${param.param_name}`;
        return (
          <div key={param.param_name} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-4 items-start">
            <div>
              <label htmlFor={inputId} className="text-sm font-medium">{formatParamName(param.param_name)}</label>
              <p id={`${inputId}-help`} className="text-sm text-gray-600 dark:text-gray-400 mt-1">{PARAMETER_HELP[param.param_name]?.help} {minVal !== undefined && `Allowed: ${minVal} to ${maxVal}${getValueSuffix(param.param_type)}.`}</p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input id={inputId} type="number" required step="any" min={minVal} max={maxVal}
                  value={inputValues[param.param_name] ?? ''} onChange={e => handleInputChange(index, e.target.value)} onBlur={() => handleInputBlur(index)}
                  aria-invalid={Boolean(error)} aria-describedby={`${inputId}-help${error ? ` ${inputId}-error` : ''}`}
                  className={`w-28 min-h-11 px-3 py-2 border rounded-md text-base dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">{getValueSuffix(param.param_type)}</span>
              </div>
              {error && <p id={`${inputId}-error`} role="alert" className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>}
            </div>
          </div>
        );
      })}
    </fieldset>
  );

  return (
    <div className="space-y-6">
      {groups.filter(group => group !== 'Inflation & reserves').map(renderGroup)}
      {groups.includes('Inflation & reserves') && <details className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <summary className="cursor-pointer min-h-11 py-2 text-sm font-medium">Inflation & reserves</summary>
        <div className="mt-3">{renderGroup('Inflation & reserves')}</div>
      </details>}
      <p className="text-sm text-gray-600 dark:text-gray-400">For percentages, enter 3.5 for 3.5%. These assumptions describe a possible future, not a recommendation.</p>
    </div>
  );
};

export default ParameterEditor;
