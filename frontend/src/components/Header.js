import React from 'react';

const Header = ({ onAddItem, onExport, onImport, onDeleteWardrobe, onSync, onSyncOnce, syncStatus }) => {
  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Capsulib</h1>
          <div className="flex items-center space-x-3">
            {syncStatus && (
              <div className="flex items-center mr-4">
                <span className={`h-3 w-3 rounded-full mr-2 ${syncStatus.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-600">
                  {syncStatus.isSyncing ? 'Syncing...' : 
                   syncStatus.lastSyncTime ? `Last sync: ${new Date(syncStatus.lastSyncTime).toLocaleTimeString()}` : 
                   'Not synced'}
                </span>
              </div>
            )}
            <button
              onClick={onSync}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Connect Remote
            </button>
            {syncStatus && syncStatus.remoteConnected && (
              <button
                onClick={onSyncOnce}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Sync Now
              </button>
            )}
            <button
              onClick={onDeleteWardrobe}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Wardrobe
            </button>
            <button
              onClick={onImport}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Import
            </button>
            <button
              onClick={onExport}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Export
            </button>
            <button
              onClick={onAddItem}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Item
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
