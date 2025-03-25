import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ItemList from './components/ItemList';
import ItemForm from './components/ItemForm';
import ExportForm from './components/ExportForm';
import Header from './components/Header';

const API_URL = 'http://localhost:8000';

function App() {
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isExportFormVisible, setIsExportFormVisible] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/items`);
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const handleAddItem = () => {
    setCurrentItem(null);
    setIsFormVisible(true);
  };

  const handleEditItem = (item) => {
    setCurrentItem(item);
    setIsFormVisible(true);
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.delete(`${API_URL}/items/${itemId}`);
        fetchItems();
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const handleFormSubmit = async (formData, images) => {
    try {
      let response;
      
      if (currentItem) {
        // Update existing item
        response = await axios.put(`${API_URL}/items/${currentItem.id}`, formData);
      } else {
        // Create new item
        response = await axios.post(`${API_URL}/items`, formData);
      }
      
      const item = response.data;
      
      // Upload images if any
      if (images && images.length > 0) {
        for (const image of images) {
          const formData = new FormData();
          formData.append('file', image);
          await axios.post(`${API_URL}/items/${item.id}/images`, formData);
        }
      }
      
      setIsFormVisible(false);
      fetchItems();
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
  };

  const handleExport = () => {
    setIsExportFormVisible(true);
  };

  const handleCloseExport = () => {
    setIsExportFormVisible(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onAddItem={handleAddItem} onExport={handleExport} />
      
      <main className="container mx-auto px-4 py-8">
        {isFormVisible ? (
          <ItemForm 
            item={currentItem} 
            onSubmit={handleFormSubmit} 
            onCancel={handleCloseForm} 
          />
        ) : (
          <ItemList 
            items={items} 
            onEditItem={handleEditItem} 
            onDeleteItem={handleDeleteItem}
          />
        )}
      </main>

      {isExportFormVisible && (
        <ExportForm onClose={handleCloseExport} />
      )}
    </div>
  );
}

export default App;