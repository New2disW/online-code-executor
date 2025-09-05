const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// This is the only thing the server does.
// It responds to the health check from Render.
app.get('/', (req, res) => {
  res.send('Hello World! The server is working.');
});

app.listen(PORT, () => {
  console.log(`Test server is running on port ${PORT}`);
});