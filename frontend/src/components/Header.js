import React from 'react';

const Header = ({ onAddItem }) => {
  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Capsulib</h1>
        <button
          onClick={onAddItem}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
        >
          Add Item
        </button>
      </div>
    </header>
  );
};

export default Header;