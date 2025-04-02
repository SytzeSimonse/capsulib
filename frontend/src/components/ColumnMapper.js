import React from 'react';

const ColumnMapper = ({ csvHeaders, availableFields, requiredFields, mappings, onMappingChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Map CSV Columns to Fields</h3>
      <p className="text-sm text-gray-600">
        Please map your CSV columns to the corresponding fields. Fields marked with * are required.
      </p>
      
      <div className="space-y-3">
        {csvHeaders.map((header) => (
          <div key={header} className="flex items-center space-x-4">
            <span className="w-1/3 text-sm font-medium text-gray-700">{header}</span>
            <select
              value={mappings[header] || ''}
              onChange={(e) => onMappingChange(header, e.target.value)}
              className="w-2/3 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Skip this column --</option>
              {availableFields.map((field) => (
                <option key={field} value={field}>
                  {field} {requiredFields.includes(field) ? '*' : ''}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColumnMapper; 