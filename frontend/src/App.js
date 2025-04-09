import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PouchDB from 'pouchdb';
import * as db from './utils/db';
import dbService from './services/DatabaseService';
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
  const [error, setError] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState(db.getSyncStatus());
  const [totalItemCount, setTotalItemCount] = useState(0);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);

  // Initialize database on component mount
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Ensure PouchDB is properly initialized in the utils/db module
        await db.getItems();
        setIsDatabaseReady(true);
      } catch (error) {
        console.error('Database initialization error:', error);
        setError('Failed to initialize local database');
        setIsDatabaseReady(false);
      }
    };

    initializeDatabase();
  }, []);

  // Fetch Items using local PouchDB
  const fetchItems = async () => {
    if (!isDatabaseReady) return;

    try {
      setIsLoading(true);
      
      // First, get total count of all items
      const allItems = await db.getItems();
      setTotalItemCount(allItems.length);
      
      // Then get filtered items if category is selected
      const filteredItems = selectedCategory 
        ? allItems.filter(item => 
            item.category.toLowerCase() === selectedCategory.toLowerCase()
          )
        : allItems;
        
      setItems(filteredItems);
      setError(null);
    } catch (error) {
      setError('Error fetching items');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add Item Handler
  const handleAddItem = async (newItem) => {
    try {
      setIsLoading(true);
      
      // First, save to local PouchDB
      const savedItem = await db.createItem(newItem);
      
      // Update local state
      setItems(prevItems => [...prevItems, savedItem]);
      setTotalItemCount(prev => prev + 1);
      
      // If online, attempt to sync with server
      if (navigator.onLine) {
        try {
          await axios.post(`${API_URL}/items`, savedItem);
        } catch (syncError) {
          console.warn('Server sync failed, item saved locally', syncError);
        }
      }
      
      // Close the form
      setShowItemForm(false);
      setCurrentItem(null);
    } catch (error) {
      console.error('Error adding item:', error);
      setError('Failed to add item');
    } finally {
      setIsLoading(false);
    }
  };

  // Modify existing useEffect to check database readiness
  useEffect(() => {
    if (isDatabaseReady) {
      fetchItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, isDatabaseReady]);

  // Render loading or error state if database is not ready
  if (!isDatabaseReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div>Loading database...</div>
        )}
      </div>
    );
  }

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
        onSync={handleSyncWithRemote}
        onSyncOnce={handleSyncOnce}
        syncStatus={syncStatus}
      />
      
      {showItemForm && (
        <ItemForm 
          item={currentItem}
          onSubmit={handleAddItem}
          onClose={() => setShowItemForm(false)}
        />
      )}
      
      {/* Rest of the existing return remains the same */}
    </div>
  );
}

export default App;
