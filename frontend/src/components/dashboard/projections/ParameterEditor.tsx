import React from 'react';
import { ProjectionParameterCreate } from '../../../types/projections';

interface ParameterEditorProps {
  parameters: ProjectionParameterCreate[];
  onChange: (parameters: ProjectionParameterCreate[]) => void;
}

const ParameterEditor: React.FC<ParameterEditorProps> = ({ parameters, onChange }) => {
  // Format parameter name for display
  const formatParamName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Handle parameter value change
  const handleValueChange = (index: number, value: string) => {
    const newParams = [...parameters];
    newParams[index].param_value = parseFloat(value) || 0;
    onChange(newParams);
  };

  // Handle parameter type change
  const handleTypeChange = (index: number, type: string) => {
    const newParams = [...parameters];
    newParams[index].param_type = type as any;
    onChange(newParams);
  };

  // Format value for display based on type
  const formatValue = (value: number, type: string) => {
    if (type === 'percentage') {
      return (value * 100).toFixed(1);
    }
    return value.toString();
  };

  // Format value for display in the input field
  const getDisplayValue = (param: ProjectionParameterCreate) => {
    if (param.param_type === 'percentage') {
      return (param.param_value * 100).toFixed(1);
    }
    return param.param_value.toString();
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
                      value={getDisplayValue(param)}
                      onChange={(e) => handleValueChange(index, e.target.value)}
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
