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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState([]);

  // Connection status handlers
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      performBackgroundSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Background synchronization
  const performBackgroundSync = async () => {
    if (!isOnline || pendingOperations.length === 0) return;

    try {
      for (const operation of pendingOperations) {
        switch (operation.type) {
          case 'create':
            await axios.post(`${API_URL}/items`, operation.item);
            break;
          case 'update':
            await axios.put(`${API_URL}/items/${operation.item.id}`, operation.item);
            break;
          case 'delete':
            await axios.delete(`${API_URL}/items/${operation.itemId}`);
            break;
        }
      }
      
      // Clear pending operations after successful sync
      setPendingOperations([]);
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  };

  // Add operation to pending queue if offline
  const queueOperation = (operation) => {
    if (!isOnline) {
      setPendingOperations(prev => [...prev, operation]);
    }
  };

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
      if (isOnline) {
        try {
          await axios.post(`${API_URL}/items`, savedItem);
        } catch (syncError) {
          console.warn('Server sync failed, item saved locally', syncError);
          queueOperation({ type: 'create', item: savedItem });
        }
      } else {
        queueOperation({ type: 'create', item: savedItem });
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

  // Update Item Handler
  const handleUpdateItem = async (updatedItem) => {
    try {
      setIsLoading(true);
      
      // First, update in local PouchDB
      const savedItem = await db.updateItem(updatedItem.id, updatedItem);
      
      // Update local state
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === savedItem.id ? savedItem : item
        )
      );
      
      // If online, attempt to sync with server
      if (isOnline) {
        try {
          await axios.put(`${API_URL}/items/${savedItem.id}`, savedItem);
        } catch (syncError) {
          console.warn('Server sync failed, item updated locally', syncError);
          queueOperation({ type: 'update', item: savedItem });
        }
      } else {
        queueOperation({ type: 'update', item: savedItem });
      }
      
      // Close the form
      setShowItemForm(false);
      setCurrentItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
      setError('Failed to update item');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Item Handler
  const handleDeleteItem = async (itemId) => {
    try {
      setIsLoading(true);
      
      // First, delete from local PouchDB
      await db.deleteItem(itemId);
      
      // Update local state
      setItems(prevItems => prevItems.filter(item => item.id !== itemId));
      setTotalItemCount(prev => prev - 1);
      
      // If online, attempt to sync with server
      if (isOnline) {
        try {
          await axios.delete(`${API_URL}/items/${itemId}`);
        } catch (syncError) {
          console.warn('Server sync failed, item deleted locally', syncError);
          queueOperation({ type: 'delete', itemId });
        }
      } else {
        queueOperation({ type: 'delete', itemId });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      setError('Failed to delete item');
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

  // Trigger background sync when online and pending operations exist
  useEffect(() => {
    if (isOnline && pendingOperations.length > 0) {
      performBackgroundSync();
    }
  }, [isOnline, pendingOperations]);

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
        isOnline={isOnline}
        pendingOperations={pendingOperations}
      />
      
      {showItemForm && (
        <ItemForm 
          item={currentItem}
          onSubmit={currentItem ? handleUpdateItem : handleAddItem}
          onClose={() => setShowItemForm(false)}
        />
      )}
      
      <ItemList 
        items={items}
        onEditItem={(item) => {
          setCurrentItem(item);
          setShowItemForm(true);
        }}
        onDeleteItem={handleDeleteItem}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        totalItemCount={totalItemCount}
      />
      
      {showImportForm && (
        <ImportForm 
          onClose={() => setShowImportForm(false)}
          onImportComplete={handleImportComplete}
        />
      )}
      
      {showDeleteConfirmation && (
        <ConfirmationDialog 
          isOpen={showDeleteConfirmation}
          onClose={() => setShowDeleteConfirmation(false)}
          onConfirm={handleDeleteWardrobe}
          title="Delete Entire Wardrobe"
          message="Are you sure you want to delete all items in your wardrobe? This action cannot be undone."
        />
      )}
    </div>
  );
}

export default App;
