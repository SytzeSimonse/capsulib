const express = require('express');
const router = express.Router();

// Sample API endpoint
router.get('/items', (req, res) => {
  res.json([
    { id: 1, name: 'White T-shirt', category: 'Tops', color: 'White' },
    { id: 2, name: 'White Jeans', category: 'Bottoms', color: 'Black' },
    { id: 3, name: 'Blue Sweater', category: 'Tops', color: 'Blue' }
  ]);
});

module.exports = router;
