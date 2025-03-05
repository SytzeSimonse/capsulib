document.addEventListener('DOMContentLoaded', () => {
    // Fetch items from the API
    fetch('/api/items')
        .then(response => response.json())
        .then(items => {
            displayItems(items);
        })
        .catch(error => {
            console.error('Error fetching items:', error);
            document.getElementById('items-container').innerHTML = 
                '<p>Error loading items. Please try again later.</p>';
        });
});

// Display items in the container
function displayItems(items) {
    const container = document.getElementById('items-container');
    
    if (items.length === 0) {
        container.innerHTML = '<p>No items found. Add some items to your wardrobe!</p>';
        return;
    }
    
    container.innerHTML = '';
    
    items.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';
        itemCard.innerHTML = `
            <h3>${item.name}</h3>
            <p>Category: ${item.category}</p>
            <p>Color: ${item.color}</p>
        `;
        container.appendChild(itemCard);
    });
}
