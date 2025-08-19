const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  
  if (req.url === '/health') {
    res.end(JSON.stringify({ status: 'healthy', message: 'Simple server working' }));
  } else {
    res.end(JSON.stringify({ message: 'Server is running', url: req.url }));
  }
});

const PORT = 3001;

server.listen(PORT, 'localhost', () => {
  console.log(`🚀 Simple HTTP server running on http://localhost:${PORT}`);
  console.log(`📈 Health check: http://localhost:${PORT}/health`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
