const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static('public'));

// Sample API endpoint
app.get('/api/items', (req, res) => {
  res.json([
    { id: 1, name: 'White T-shirt', category: 'Tops', color: 'White' },
    { id: 2, name: 'White Jeans', category: 'Bottoms', color: 'Black' },
    { id: 3, name: 'Blue Sweater', category: 'Tops', color: 'Blue' }
  ]);
});

// Home route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(port, () => {
  console.log(`Capsulib app listening at http://localhost:${port}`);
});
