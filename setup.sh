#!/bin/bash

echo "🚀 FPL Expected Points - Setup Script"
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi
echo "✅ Backend dependencies installed"

# Install frontend dependencies
echo "📱 Installing frontend dependencies..."
cd ../FantasyPremierLeague
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi
echo "✅ Frontend dependencies installed"

# Create .env file for backend if it doesn't exist
cd ../backend
if [ ! -f .env ]; then
    echo "🔧 Creating .env file for backend..."
    cat > .env << EOF
PORT=3001
HOST=localhost
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

cd ..

echo ""
echo "🎉 Setup complete! You can now run the application:"
echo ""
echo "1. Start the backend API:"
echo "   cd backend && npm run dev"
echo ""
echo "2. Start the React Native app:"
echo "   cd FantasyPremierLeague && npm start"
echo ""
echo "3. Open Expo Go on your device and scan the QR code"
echo ""
echo "📱 The API will be available at: http://localhost:3001"
echo "🔗 Health check: http://localhost:3001/health"
echo ""
echo "Happy FPL managing! 🏆"
