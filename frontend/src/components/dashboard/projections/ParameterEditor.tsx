import React, { useState, useEffect } from 'react';
import { ProjectionParameterCreate } from '../../../types/projections';

interface ParameterEditorProps {
  parameters: ProjectionParameterCreate[];
  onChange: (parameters: ProjectionParameterCreate[]) => void;
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

const ParameterEditor: React.FC<ParameterEditorProps> = ({ parameters, onChange }) => {
  // State to track input values separately from parameter values
  const [inputValues, setInputValues] = useState<string[]>([]);
  // State to track validation errors
  const [validationErrors, setValidationErrors] = useState<(string | null)[]>([]);

  // Initialize input values and clear errors when parameters change
  useEffect(() => {
    const initialInputs = parameters.map(param => {
      if (param.param_type === 'percentage') {
        return (param.param_value * 100).toFixed(1);
      }
      return param.param_value.toString();
    });
    setInputValues(initialInputs);
    setValidationErrors(parameters.map(() => null));
  }, [parameters]); // Re-initialize when parameters change

  // Format parameter name for display
  const formatParamName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Handle input value change (just update the input state)
  const handleInputChange = (index: number, value: string) => {
    const newInputValues = [...inputValues];
    newInputValues[index] = value;
    setInputValues(newInputValues);
  };

  // Validate a parameter value against its bounds
  const validateValue = (paramName: string, value: number, isPercentage: boolean): string | null => {
    const bounds = PARAMETER_BOUNDS[paramName];
    if (!bounds) return null;
    
    // For percentage types, compare against display bounds (user enters %, we store decimal)
    const compareValue = isPercentage ? value : value;
    const minBound = isPercentage ? bounds.displayMin : bounds.min;
    const maxBound = isPercentage ? bounds.displayMax : bounds.max;
    
    if (compareValue < minBound || compareValue > maxBound) {
      return `Must be between ${minBound} and ${maxBound}`;
    }
    return null;
  };

  // Handle blur event to update the actual parameter value
  const handleInputBlur = (index: number) => {
    const newParams = [...parameters];
    const param = newParams[index];
    let parsedValue = parseFloat(inputValues[index]) || 0;
    
    // Validate the input value
    const error = validateValue(param.param_name, parsedValue, param.param_type === 'percentage');
    const newErrors = [...validationErrors];
    newErrors[index] = error;
    setValidationErrors(newErrors);
    
    // If there's an error, clamp the value to bounds
    if (error) {
      const bounds = PARAMETER_BOUNDS[param.param_name];
      if (bounds) {
        const minBound = param.param_type === 'percentage' ? bounds.displayMin : bounds.min;
        const maxBound = param.param_type === 'percentage' ? bounds.displayMax : bounds.max;
        parsedValue = Math.max(minBound, Math.min(maxBound, parsedValue));
        
        // Update the input value to show the clamped value
        const newInputValues = [...inputValues];
        newInputValues[index] = parsedValue.toString();
        setInputValues(newInputValues);
        
        // Clear the error after clamping
        newErrors[index] = null;
        setValidationErrors(newErrors);
      }
    }
    
    // Convert percentage inputs back to decimal form for storage
    if (param.param_type === 'percentage') {
      newParams[index].param_value = parsedValue / 100;
    } else {
      newParams[index].param_value = parsedValue;
    }
    
    onChange(newParams);
  };

  // Get suffix for parameter type
  const getValueSuffix = (type: string) => {
    switch (type) {
      case 'percentage':
        return '%';
      case 'months':
        return ' months';
      case 'amount':
        return ' €';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b dark:bg-gray-700">
              <th className="w-[300px] text-left p-3 font-medium">Parameter</th>
              <th className="text-left p-3 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param, index) => {
              const bounds = PARAMETER_BOUNDS[param.param_name];
              const minVal = bounds ? (param.param_type === 'percentage' ? bounds.displayMin : bounds.min) : undefined;
              const maxVal = bounds ? (param.param_type === 'percentage' ? bounds.displayMax : bounds.max) : undefined;
              const hasError = validationErrors[index] !== null;
              
              return (
                <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-3 font-medium">
                    {formatParamName(param.param_name)}
                    {bounds && (
                      <span className="block text-xs text-gray-400 font-normal">
                        {minVal} to {maxVal}{param.param_type === 'percentage' ? '%' : ''}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={inputValues[index] || ''}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                        onBlur={() => handleInputBlur(index)}
                        min={minVal}
                        max={maxVal}
                        className={`w-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 dark:bg-gray-700 ${
                          hasError 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-600'
                        }`}
                        step={param.param_type === 'percentage' ? '0.1' : '1'}
                      />
                      <span className="text-gray-500 text-sm">
                        {getValueSuffix(param.param_type)}
                      </span>
                    </div>
                    {hasError && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors[index]}</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="text-sm text-gray-500 dark:text-gray-400">
        <p>
          <strong>Note:</strong> For percentage values, enter the number as a percentage (e.g., 3.5 for 3.5%).
        </p>
      </div>
    </div>
  );
};

export default ParameterEditor;
