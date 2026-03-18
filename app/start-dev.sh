#!/bin/bash
# Start CyberDope in development mode
# Runs both backend and frontend

echo "🔒 Starting CyberDope Development Server..."
echo ""

# Start backend in background
echo "🤖 Starting AI Backend on port 3001..."
cd server
node simple-server.js &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
echo ""

# Wait for backend to start
sleep 2

# Check if backend is running
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend is running!"
else
    echo "❌ Backend failed to start"
    exit 1
fi
echo ""

# Start frontend
echo "🌐 Starting Frontend..."
cd ..
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
echo ""

echo "=========================================="
echo "🚀 CyberDope is running!"
echo ""
echo "📱 Frontend: http://localhost:5173"
echo "🤖 Backend:  http://localhost:3001"
echo "💚 Health:   http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "=========================================="
echo ""

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
