import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import PouchDBHttp from 'pouchdb-adapter-http';

// Register plugins
PouchDB.plugin(PouchDBFind);
PouchDB.plugin(PouchDBHttp);

// Initialize the database
const db = new PouchDB('capsulib');

// Create indexes for querying
db.createIndex({
  index: {
    fields: ['category', 'name', 'brand', 'created_at']
  }
}).catch(err => console.error('Error creating index:', err));

// Helper function to generate a unique ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Convert API item format to PouchDB document format
const apiToDoc = (item) => {
  const doc = {
    _id: item.id ? item.id.toString() : generateId(),
    ...item,
    type: 'item' // Add a type field for querying
  };
  
  // If this is a new item (no id from API), remove the id field
  if (!item.id) {
    delete doc.id;
  }
  
  return doc;
};

// Convert PouchDB document to API format
const docToApi = (doc) => {
  const item = { ...doc };
  
  // Set id from _id
  item.id = parseInt(doc._id, 10) || doc._id;
  
  // Remove PouchDB specific fields
  delete item._id;
  delete item._rev;
  delete item.type;
  
  return item;
};

// CRUD Operations

// Get all items, optionally filtered by category
export const getItems = async (category = null) => {
  try {
    let query = {
      selector: {
        type: 'item'
      }
    };
    
    if (category) {
      if (category.toLowerCase() === 'other') {
        // For "Other" category, get items with empty or null category
        query.selector.$or = [
          { category: '' },
          { category: { $exists: false } },
          { category: 'other' },
          { category: 'Other' }
        ];
      } else {
        // Case-insensitive search is not directly supported in PouchDB
        // We'll filter results after fetching
        query.selector.category = { $regex: new RegExp(category, 'i') };
      }
    }
    
    const result = await db.find(query);
    return result.docs.map(docToApi);
  } catch (error) {
    console.error('Error getting items:', error);
    throw error;
  }
};

// Get a single item by ID
export const getItem = async (id) => {
  try {
    const doc = await db.get(id.toString());
    return docToApi(doc);
  } catch (error) {
    console.error(`Error getting item ${id}:`, error);
    throw error;
  }
};

// Create a new item
export const createItem = async (item) => {
  try {
    const doc = apiToDoc(item);
    const response = await db.put(doc);
    
    if (response.ok) {
      const newDoc = await db.get(response.id);
      return docToApi(newDoc);
    }
    throw new Error('Failed to create item');
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
};

// Update an existing item
export const updateItem = async (id, item) => {
  try {
    // Get the current document to preserve _rev
    const currentDoc = await db.get(id.toString());
    
    // Prepare updated document
    const updatedDoc = {
      ...apiToDoc(item),
      _id: id.toString(),
      _rev: currentDoc._rev
    };
    
    const response = await db.put(updatedDoc);
    
    if (response.ok) {
      const newDoc = await db.get(response.id);
      return docToApi(newDoc);
    }
    throw new Error('Failed to update item');
  } catch (error) {
    console.error(`Error updating item ${id}:`, error);
    throw error;
  }
};

// Delete an item
export const deleteItem = async (id) => {
  try {
    const doc = await db.get(id.toString());
    await db.remove(doc);
    return { ok: true };
  } catch (error) {
    console.error(`Error deleting item ${id}:`, error);
    throw error;
  }
};

// Delete all items
export const deleteAllItems = async () => {
  try {
    const result = await db.find({
      selector: { type: 'item' }
    });
    
    // Bulk delete all items
    const docsToDelete = result.docs.map(doc => ({
      _id: doc._id,
      _rev: doc._rev,
      _deleted: true
    }));
    
    if (docsToDelete.length > 0) {
      await db.bulkDocs(docsToDelete);
    }
    
    return { ok: true };
  } catch (error) {
    console.error('Error deleting all items:', error);
    throw error;
  }
};

// Sync with remote CouchDB server
export const syncWithRemote = async (remoteUrl) => {
  try {
    const remoteDb = new PouchDB(remoteUrl);
    await db.sync(remoteDb, {
      live: true,
      retry: true
    }).on('error', function (err) {
      console.error('Sync error:', err);
    });
    
    return { ok: true };
  } catch (error) {
    console.error('Error syncing with remote:', error);
    throw error;
  }
};

export default {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  deleteAllItems,
  syncWithRemote
};
