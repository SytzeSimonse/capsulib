document.addEventListener('DOMContentLoaded', () => {
    // Fetch items from the API
    fetchItems();
});

async function fetchItems() {
    try {
        const response = await fetch('/api/items');
        const items = await response.json();
        displayItems(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        document.getElementById('items-container').innerHTML = 
            '<p>Error loading items. Please try again later.</p>';
    }
}

function displayItems(items) {
    const container = document.getElementById('items-container');
    
    if (items.length === 0) {
        container.innerHTML = '<p>No items found in your wardrobe.</p>';
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
