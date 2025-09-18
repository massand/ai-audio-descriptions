const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle client-side routing - serve index.html for all routes
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/assets/') && !req.path.includes('.')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    next();
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
