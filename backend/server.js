const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Import API routes
const apiRoutes = require('./api');

app.use(cors());
app.use(express.json());

// Serve static files from the frontend/public directory
app.use(express.static(path.join(__dirname, '../frontend/public')));

// API routes
app.use('/api', apiRoutes);

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.listen(port, () => {
  console.log(`Capsulib app listening at http://localhost:${port}`);
});
