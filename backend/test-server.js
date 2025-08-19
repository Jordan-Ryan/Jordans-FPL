const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', message: 'Test server running' });
});

app.get('/', (req, res) => {
  res.json({ message: 'Test server is working' });
});

const PORT = 3001;
const HOST = 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Test server running on http://${HOST}:${PORT}`);
  console.log(`📈 Health check: http://${HOST}:${PORT}/health`);
});
