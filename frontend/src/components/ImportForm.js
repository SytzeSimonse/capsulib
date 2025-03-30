import React, { useState } from 'react';
import axios from 'axios';
import ColumnMapper from './ColumnMapper';

const API_URL = 'http://localhost:8000';

const ImportForm = ({ onClose, onImportComplete }) => {
  const [step, setStep] = useState('upload'); // 'upload', 'map', 'import'
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [columnMappings, setColumnMappings] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(`${API_URL}/items/import/preview`, formData);
      setPreviewData(response.data);
      setStep('map');
    } catch (error) {
      setError('Error processing file. Please make sure it\'s a valid CSV file.');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingChange = (csvHeader, field) => {
    setColumnMappings(prev => ({
      ...prev,
      [csvHeader]: field
    }));
  };

  const handleImport = async () => {
    // Validate required fields
    const { required_fields } = previewData;
    const mappedFields = new Set(Object.values(columnMappings));
    const missingRequired = required_fields.filter(field => !mappedFields.has(field));

    if (missingRequired.length > 0) {
      setError(`Please map the following required fields: ${missingRequired.join(', ')}`);
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mappings', JSON.stringify(columnMappings));

      await axios.post(`${API_URL}/items/import`, formData);
      onImportComplete();
    } catch (error) {
      setError('Error importing items. Please try again.');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Import Items from CSV</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <span className="sr-only">Close</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {step === 'upload' && (
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Upload your CSV file to start the import process.
          </p>
        </div>
      )}

      {step === 'map' && previewData && (
        <>
          <ColumnMapper
            csvHeaders={previewData.headers}
            availableFields={previewData.available_fields}
            requiredFields={previewData.required_fields}
            mappings={columnMappings}
            onMappingChange={handleMappingChange}
          />

          <div className="mt-4">
            <h3 className="font-semibold mb-2">Preview</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    {previewData.headers.map((header) => (
                      <th key={header} className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                        {header} → {columnMappings[header] || 'Not mapped'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.preview_rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        {step === 'map' && (
          <button
            onClick={handleImport}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Importing...' : 'Import'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ImportForm; 