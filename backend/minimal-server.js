const express = require('express');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'FPL Expected Points API',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    service: 'FPL Expected Points API',
    status: 'running'
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working correctly' });
});

const PORT = 3001;
const HOST = 'localhost';

console.log('Starting minimal server...');

app.listen(PORT, HOST, () => {
  console.log(`🚀 Minimal server running on http://${HOST}:${PORT}`);
  console.log(`📈 Health check: http://${HOST}:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://${HOST}:${PORT}/test`);
});

// Handle errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
