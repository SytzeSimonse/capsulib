import React, { useState, useEffect } from 'react';

const COMMON_MATERIALS = [
  'Cotton',
  'Wool',
  'Silk',
  'Linen',
  'Polyester',
  'Denim',
  'Leather',
  'Suede',
  'Cashmere',
  'Rayon',
  'Nylon',
  'Spandex',
  'Velvet',
  'Fleece',
  'Tweed',
  'Chiffon',
  'Satin',
  'Mesh',
  'Canvas',
  'Lycra'
];

const ITEM_CONDITIONS = [
  'New with price tag',
  'New without price tag',
  'Very good',
  'Good',
  'Used a lot'
];

const COLOR_PALETTE = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Gray', hex: '#808080' },
  { name: 'Red', hex: '#FF0000' },
  { name: 'Blue', hex: '#0000FF' },
  { name: 'Green', hex: '#008000' },
  { name: 'Yellow', hex: '#FFFF00' },
  { name: 'Purple', hex: '#800080' },
  { name: 'Pink', hex: '#FFC0CB' },
  { name: 'Orange', hex: '#FFA500' },
  { name: 'Brown', hex: '#A52A2A' },
  { name: 'Beige', hex: '#F5F5DC' },
  { name: 'Navy', hex: '#000080' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Khaki', hex: '#F0E68C' }
];

const SEASONS = [
  'Spring',
  'Summer',
  'Fall',
  'Winter',
  'Spring/Summer',
  'Summer/Fall',
  'Fall/Winter',
  'Winter/Spring',
  'All Seasons'
];

const PATTERNS = [
  { name: 'Solid', icon: '■' },
  { name: 'Striped', icon: '▰▱▰▱' },
  { name: 'Polka Dot', icon: '⚪' },
  { name: 'Floral', icon: '🌸' },
  { name: 'Paisley', icon: '🌺' },
  { name: 'Animal Print', icon: '🐆' },
  { name: 'Plaid', icon: '▤' },
  { name: 'Checkered', icon: '▣' },
  { name: 'Ribbed', icon: '〰️' },
  { name: 'Graphic Print', icon: '🎨' },
  { name: 'Camouflage', icon: '🌿' },
  { name: 'Tie Dye', icon: '🌈' },
  { name: 'Ombre', icon: '↔️' },
  { name: 'Metallic', icon: '✨' },
  { name: 'Sequined', icon: '💫' }
];

const ItemForm = ({ item, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    brand: '',
    name: '',
    category: '',
    colors: [],
    materials: [],
    size: '',
    purchase_date: '',
    purchase_price: '',
    condition: '',
    description: '',
    season: '',
    is_second_hand: false,
    pattern: ''
  });
  
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  useEffect(() => {
    // Initialize form data when editing an item
    if (item) {
      setFormData({
        ...item,
        purchase_date: item.purchase_date ? item.purchase_date.split('T')[0] : '',
        // Handle arrays
        colors: Array.isArray(item.colors) ? item.colors : [],
        materials: Array.isArray(item.materials) ? item.materials : [],
        // Handle boolean
        is_second_hand: item.is_second_hand || false
      });
      
      // Set existing images
      if (item.images && item.images.length > 0) {
        setExistingImages(item.images);
      }
    }
  }, [item]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleMaterialChange = (material) => {
    setFormData(prev => {
      const materials = prev.materials.includes(material)
        ? prev.materials.filter(m => m !== material)
        : [...prev.materials, material];
      return { ...prev, materials };
    });
  };

  const handleColorChange = (color) => {
    setFormData(prev => {
      const colors = prev.colors.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color];
      return { ...prev, colors };
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Check if adding these files would exceed the 10-image limit
    if (existingImages.length + selectedFiles.length + files.length > 10) {
      alert('You can only upload up to 10 images per item');
      return;
    }
    
    setSelectedFiles(prev => [...prev, ...files]);
    
    // Create preview URLs for new files
    const newUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newUrls]);
  };

  const handleRemoveImage = (index, isExisting = false) => {
    if (isExisting) {
      // Remove from existing images
      setExistingImages(prev => prev.filter((_, i) => i !== index));
    } else {
      // Revoke the object URL to prevent memory leaks
      URL.revokeObjectURL(previewUrls[index]);
      
      // Remove the file and its preview URL
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
      setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData, selectedFiles);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">
        {item ? 'Edit Item' : 'Add New Item'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 mb-1">Brand</label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select category</option>
              <option value="tops">Tops</option>
              <option value="bottoms">Bottoms</option>
              <option value="dresses">Dresses</option>
              <option value="outerwear">Outerwear</option>
              <option value="shoes">Shoes</option>
              <option value="accessories">Accessories</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Condition</label>
            <select
              name="condition"
              value={formData.condition}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select condition</option>
              {ITEM_CONDITIONS.map(condition => (
                <option key={condition} value={condition}>{condition}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Materials</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {COMMON_MATERIALS.map((material) => (
                <label key={material} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.materials.includes(material)}
                    onChange={() => handleMaterialChange(material)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{material}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Size</label>
            <input
              type="text"
              name="size"
              value={formData.size}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Purchase Date</label>
            <input
              type="date"
              name="purchase_date"
              value={formData.purchase_date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Purchase Price</label>
            <input
              type="number"
              name="purchase_price"
              value={formData.purchase_price}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Season</label>
            <select
              name="season"
              value={formData.season}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select season</option>
              {SEASONS.map(season => (
                <option key={season} value={season}>{season}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Second-hand</label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="is_second_hand"
                  checked={formData.is_second_hand === true}
                  onChange={() => setFormData(prev => ({ ...prev, is_second_hand: true }))}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Yes</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="is_second_hand"
                  checked={formData.is_second_hand === false}
                  onChange={() => setFormData(prev => ({ ...prev, is_second_hand: false }))}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">No</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Pattern/Print</label>
            <select
              name="pattern"
              value={formData.pattern}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select pattern</option>
              {PATTERNS.map(pattern => (
                <option key={pattern.name} value={pattern.name}>
                  {pattern.icon} {pattern.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Colors</label>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {COLOR_PALETTE.map((color) => (
              <label key={color.name} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.colors.includes(color.name)}
                  onChange={() => handleColorChange(color.name)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-sm text-gray-700">{color.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">
            Images (up to 10)
            <span className="text-sm text-gray-500 ml-2">
              {existingImages.length + selectedFiles.length}/10 images
            </span>
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            multiple
            accept="image/*"
            disabled={existingImages.length + selectedFiles.length >= 10}
          />
          
          {(existingImages.length > 0 || previewUrls.length > 0) && (
            <div className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Existing images */}
                {existingImages.map((image, index) => (
                  <div key={`existing-${index}`} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={`http://localhost:8000/uploads/${image}`}
                        alt={`Existing image ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index, true)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
                
                {/* New image previews */}
                {previewUrls.map((url, index) => (
                  <div key={`new-${index}`} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index, false)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="Describe your item..."
          ></textarea>
        </div>
        
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {item ? 'Update Item' : 'Create Item'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ItemForm;