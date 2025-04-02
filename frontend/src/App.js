import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ItemList from './components/ItemList';
import ItemForm from './components/ItemForm';
import ImportForm from './components/ImportForm';
import Header from './components/Header';
import ConfirmationDialog from './components/ConfirmationDialog';

const API_URL = 'http://localhost:8000';

function App() {
  const [items, setItems] = useState([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/items`);
      setItems(response.data);
    } catch (error) {
      setError('Error fetching items');
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAddItem = async (itemData) => {
    try {
      await axios.post(`${API_URL}/items`, itemData);
      fetchItems();
      setShowItemForm(false);
      setCurrentItem(null);
    } catch (error) {
      setError('Error adding item');
      console.error('Error:', error);
    }
  };

  const handleUpdateItem = async (itemData) => {
    try {
      // Create a copy of the data to modify
      const formattedData = { ...itemData };
      
      // Convert empty strings to null or appropriate default values
      Object.keys(formattedData).forEach(key => {
        if (formattedData[key] === '') {
          if (key === 'colors' || key === 'materials') {
            formattedData[key] = [];
          } else if (key === 'is_second_hand') {
            formattedData[key] = false;
          } else {
            formattedData[key] = null;
          }
        }
      });

      // If purchase_date is not empty, ensure it's in ISO format
      if (formattedData.purchase_date) {
        formattedData.purchase_date = new Date(formattedData.purchase_date).toISOString();
      }

      await axios.put(`${API_URL}/items/${currentItem.id}`, formattedData);
      fetchItems();
      setShowItemForm(false);
      setCurrentItem(null);
    } catch (error) {
      setError('Error updating item');
      console.error('Error:', error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await axios.delete(`${API_URL}/items/${itemId}`);
      fetchItems();
    } catch (error) {
      setError('Error deleting item');
      console.error('Error:', error);
    }
  };

  const handleDeleteWardrobe = async () => {
    setIsLoading(true);
    try {
      await axios.delete(`${API_URL}/items`);
      setItems([]);
      setShowDeleteConfirmation(false);
    } catch (error) {
      setError('Error deleting wardrobe');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportComplete = () => {
    fetchItems();
    setShowImportForm(false);
  };

  const handleEditItem = (item) => {
    setCurrentItem(item);
    setShowItemForm(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header 
        onAddItem={() => {
          setCurrentItem(null);
          setShowItemForm(true);
        }}
        onExport={() => {/* TODO: Implement export */}}
        onImport={() => setShowImportForm(true)}
        onDeleteWardrobe={() => setShowDeleteConfirmation(true)}
      />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {showItemForm ? (
            <ItemForm
              item={currentItem}
              onClose={() => {
                setShowItemForm(false);
                setCurrentItem(null);
              }}
              onSubmit={currentItem 
                ? (itemData) => handleUpdateItem(itemData)
                : handleAddItem
              }
            />
          ) : showImportForm ? (
            <ImportForm
              onClose={() => setShowImportForm(false)}
              onImportComplete={handleImportComplete}
            />
          ) : (
            <ItemList
              items={items}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
            />
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDeleteWardrobe}
        title="Delete Wardrobe"
        message="Are you sure you want to delete all items in your wardrobe? This action cannot be undone."
      />
    </div>
  );
}

export default App;