#!/bin/bash

# Start the Expo server in the background
echo "Starting Fantasy Premier League server in background..."
npx expo start --web --port 8082 > server.log 2>&1 &

# Get the process ID
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"
echo "Server is running at: http://localhost:8082"
echo "Logs are being written to: server.log"
echo ""
echo "To stop the server, run: pkill -f 'expo start'"
echo "To view logs: tail -f server.log"
echo ""
echo "Server is now running in the background!" 