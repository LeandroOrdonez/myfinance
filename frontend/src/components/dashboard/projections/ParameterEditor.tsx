import React, { useState, useEffect } from 'react';
import { ProjectionParameterCreate } from '../../../types/projections';

interface ParameterEditorProps {
  parameters: ProjectionParameterCreate[];
  onChange: (parameters: ProjectionParameterCreate[]) => void;
}

const ParameterEditor: React.FC<ParameterEditorProps> = ({ parameters, onChange }) => {
  // State to track input values separately from parameter values
  const [inputValues, setInputValues] = useState<string[]>([]);

  // Initialize input values when parameters change
  useEffect(() => {
    const initialInputs = parameters.map(param => {
      if (param.param_type === 'percentage') {
        return (param.param_value * 100).toFixed(1);
      }
      return param.param_value.toString();
    });
    setInputValues(initialInputs);
  }, [parameters.length]); // Only re-initialize when the number of parameters changes

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

  // Handle blur event to update the actual parameter value
  const handleInputBlur = (index: number) => {
    const newParams = [...parameters];
    let parsedValue = parseFloat(inputValues[index]) || 0;
    
    // Convert percentage inputs back to decimal form for storage
    if (newParams[index].param_type === 'percentage') {
      newParams[index].param_value = parsedValue / 100;
    } else {
      newParams[index].param_value = parsedValue;
    }
    
    onChange(newParams);
  };

  // Handle parameter type change
  const handleTypeChange = (index: number, type: string) => {
    const newParams = [...parameters];
    const oldType = newParams[index].param_type;
    const currentValue = newParams[index].param_value;
    const newInputValues = [...inputValues];
    
    // Convert value when switching between percentage and non-percentage types
    if (oldType === 'percentage' && type !== 'percentage') {
      // Convert from decimal (0.035) to actual value (3.5)
      newParams[index].param_value = currentValue * 100;
      newInputValues[index] = (currentValue * 100).toString();
    } else if (oldType !== 'percentage' && type === 'percentage') {
      // Convert from actual value (3.5) to decimal (0.035)
      newParams[index].param_value = currentValue / 100;
      newInputValues[index] = (currentValue).toFixed(1);
    }
    
    newParams[index].param_type = type as any;
    setInputValues(newInputValues);
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
            <tr className="bg-gray-50 border-b">
              <th className="w-[300px] text-left p-3 font-medium">Parameter</th>
              <th className="text-left p-3 font-medium">Value</th>
              <th className="text-left p-3 font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{formatParamName(param.param_name)}</td>
                <td className="p-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={inputValues[index] || ''}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onBlur={() => handleInputBlur(index)}
                      className="w-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step={param.param_type === 'percentage' ? '0.1' : '1'}
                    />
                    <span className="text-gray-500 text-sm">
                      {getValueSuffix(param.param_type)}
                    </span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="relative w-[140px]">
                    <select
                      value={param.param_type}
                      onChange={(e) => handleTypeChange(index, e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="amount">Amount</option>
                      <option value="months">Months</option>
                      <option value="integer">Integer</option>
                      <option value="boolean">Boolean</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="text-sm text-gray-500">
        <p>
          <strong>Note:</strong> For percentage values, enter the number as a percentage (e.g., 3.5 for 3.5%).
        </p>
      </div>
    </div>
  );
};

export default ParameterEditor;
