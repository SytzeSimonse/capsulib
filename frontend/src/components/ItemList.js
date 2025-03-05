import React from 'react';

const ItemList = ({ items, onEditItem, onDeleteItem }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-medium text-gray-600">Your wardrobe is empty</h2>
        <p className="mt-2 text-gray-500">Start adding items to your capsule wardrobe</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Your Wardrobe Items</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="h-48 bg-gray-200 flex items-center justify-center">
              {item.images && item.images.length > 0 ? (
                <img
                  src={`http://localhost:8000/uploads/${item.images[0]}`}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-gray-400 text-center">No image</div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-lg font-medium">{item.name}</h3>
              <p className="text-gray-600">{item.brand}</p>
              <div className="mt-2 flex flex-wrap">
                {item.colors.map((color, index) => (
                  <span 
                    key={index} 
                    className="mr-2 mb-2 text-xs px-2 py-1 bg-gray-100 rounded-full"
                  >
                    {color}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex justify-between">
                <button
                  onClick={() => onEditItem(item)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItemList;