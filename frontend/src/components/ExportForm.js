import React, { useState } from 'react';
import axios from 'axios';

const ExportForm = ({ onClose }) => {
  const [fields, setFields] = useState({
    id: true,
    brand: true,
    name: true,
    category: true,
    colors: true,
    material: true,
    size: true,
    purchase_date: true,
    notes: true,
    created_at: false,
    updated_at: false,
    include_image_urls: false,
    include_image_files: false
  });

  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFields({
      ...fields,
      [name]: checked
    });
  };

  const handleSelectAll = () => {
    const allTrue = {};
    Object.keys(fields).forEach(key => {
      allTrue[key] = true;
    });
    setFields(allTrue);
  };

  const handleSelectNone = () => {
    const allFalse = {};
    Object.keys(fields).forEach(key => {
      allFalse[key] = false;
    });
    setFields(allFalse);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      
      // Convert fields object to array of selected fields
      const selectedFields = Object.keys(fields).filter(key => fields[key]);
      
      // Make request to the backend
      const response = await axios.get('http://localhost:8000/export', {
        params: { fields: selectedFields.join(',') },
        responseType: 'blob' // Important for file downloads
      });
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `capsulib_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      link.remove();
      
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Export Wardrobe Data</h2>
        
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <p className="text-gray-700 font-medium">Select fields to export</p>
            <div className="space-x-2">
              <button 
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <button 
                onClick={handleSelectNone}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select None
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(fields).map(field => (
              <div key={field} className="flex items-center">
                <input
                  type="checkbox"
                  id={`field-${field}`}
                  name={field}
                  checked={fields[field]}
                  onChange={handleCheckboxChange}
                  className="mr-2"
                />
                <label htmlFor={`field-${field}`} className="text-gray-700">
                  {field.replace(/_/g, ' ')}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Note:</strong> "include_image_urls" will add image URLs to your CSV.</p>
          <p>"include_image_files" will create a zip file containing your CSV and all images.</p>
        </div>
        
        {error && (
          <div className="mt-4 text-red-600 text-sm">
            {error}
          </div>
        )}
        
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || Object.values(fields).every(v => !v)}
            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${
              (isExporting || Object.values(fields).every(v => !v)) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportForm;