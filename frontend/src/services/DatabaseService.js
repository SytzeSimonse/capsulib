import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import PouchDBHttp from 'pouchdb-adapter-http';
import { EventEmitter } from 'events';

// Register plugins
PouchDB.plugin(PouchDBFind);
PouchDB.plugin(PouchDBHttp);

class DatabaseService extends EventEmitter {
  constructor() {
    super();
    this.localDb = new PouchDB('capsulib');
    this.remoteDb = null;
    this.syncHandler = null;
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncErrors = [];
    
    // Create indexes for querying
    this.localDb.createIndex({
      index: {
        fields: ['category', 'name', 'brand', 'created_at', 'type']
      }
    }).catch(err => console.error('Error creating index:', err));
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleConnectionChange.bind(this));
    window.addEventListener('offline', this.handleConnectionChange.bind(this));
  }
  
  // Handle online/offline status changes
  handleConnectionChange() {
    const wasOnline = this.isOnline;
    this.isOnline = navigator.onLine;
    
    // Emit connection status change event
    this.emit('connectionChange', this.isOnline);
    
    // If we're coming back online and sync is enabled, restart sync
    if (!wasOnline && this.isOnline && this.syncHandler) {
      this.restartSync();
    }
  }
  
  // Connect to a remote CouchDB server
  async connectToRemote(remoteUrl, options = {}) {
    try {
      // Cancel any existing sync
      this.cancelSync();
      
      // Create new remote DB connection
      this.remoteDb = new PouchDB(remoteUrl);
      
      // Test connection
      await this.remoteDb.info();
      
      // Start sync if autoSync is true
      if (options.autoSync) {
        this.startSync(options);
      }
      
      this.emit('remoteConnected', { url: remoteUrl });
      return { success: true, message: 'Connected to remote database' };
    } catch (error) {
      this.emit('error', { type: 'connection', error });
      return { success: false, error: error.message };
    }
  }
  
  // Start synchronization with remote database
  startSync(options = {}) {
    if (!this.remoteDb) {
      this.emit('error', { 
        type: 'sync', 
        error: new Error('No remote database connected') 
      });
      return false;
    }
    
    // Cancel any existing sync
    this.cancelSync();
    
    // Set sync options
    const syncOptions = {
      live: options.live !== false,
      retry: options.retry !== false,
      ...options
    };
    
    // Start sync
    this.isSyncing = true;
    this.syncHandler = this.localDb.sync(this.remoteDb, syncOptions)
      .on('change', (change) => {
        this.emit('syncChange', change);
      })
      .on('paused', () => {
        this.lastSyncTime = new Date();
        this.emit('syncPaused', { lastSyncTime: this.lastSyncTime });
      })
      .on('active', () => {
        this.emit('syncActive');
      })
      .on('denied', (err) => {
        this.syncErrors.push(err);
        this.emit('syncDenied', err);
      })
      .on('complete', (info) => {
        this.isSyncing = false;
        this.lastSyncTime = new Date();
        this.emit('syncComplete', info);
      })
      .on('error', (err) => {
        this.isSyncing = false;
        this.syncErrors.push(err);
        this.emit('syncError', err);
      });
    
    this.emit('syncStarted');
    return true;
  }
  
  // Cancel synchronization
  cancelSync() {
    if (this.syncHandler) {
      this.syncHandler.cancel();
      this.syncHandler = null;
      this.isSyncing = false;
      this.emit('syncCancelled');
      return true;
    }
    return false;
  }
  
  // Restart synchronization
  restartSync(options = {}) {
    this.cancelSync();
    return this.startSync(options);
  }
  
  // Perform one-time sync (not continuous)
  async syncOnce() {
    if (!this.remoteDb) {
      this.emit('error', { 
        type: 'sync', 
        error: new Error('No remote database connected') 
      });
      return { success: false, error: 'No remote database connected' };
    }
    
    try {
      const result = await this.localDb.sync(this.remoteDb);
      this.lastSyncTime = new Date();
      this.emit('syncComplete', result);
      return { success: true, result };
    } catch (error) {
      this.syncErrors.push(error);
      this.emit('syncError', error);
      return { success: false, error: error.message };
    }
  }
  
  // Get sync status
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      syncErrors: this.syncErrors.slice(-5), // Return last 5 errors
      remoteConnected: !!this.remoteDb
    };
  }
  
  // Clear sync errors
  clearSyncErrors() {
    this.syncErrors = [];
    this.emit('syncErrorsCleared');
  }
  
  // Disconnect from remote
  disconnectRemote() {
    this.cancelSync();
    if (this.remoteDb) {
      this.remoteDb.close();
      this.remoteDb = null;
      this.emit('remoteDisconnected');
      return true;
    }
    return false;
  }
  
  // Get the local database instance
  getLocalDb() {
    return this.localDb;
  }
  
  // Get the remote database instance
  getRemoteDb() {
    return this.remoteDb;
  }
  
  // Destroy local database (for testing/reset purposes)
  async destroyLocalDb() {
    this.cancelSync();
    try {
      await this.localDb.destroy();
      this.localDb = new PouchDB('capsulib');
      this.emit('localDbReset');
      return { success: true };
    } catch (error) {
      this.emit('error', { type: 'destroy', error });
      return { success: false, error: error.message };
    }
  }
}

// Create a singleton instance
const dbService = new DatabaseService();

export default dbService;
