#!/bin/bash

# Start both development servers in parallel
# This script starts the API server and Frontend server together

echo "🚀 Starting DPP Browser Development Environment..."
echo ""
echo "Starting API Server (port 3000)..."
echo "Starting Frontend (port 5173)..."
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start API server in background
npm run dev:api &
API_PID=$!

# Wait a moment for API server to start
sleep 2

# Start frontend server in background
npm run dev &
FRONTEND_PID=$!

# Function to kill both processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $API_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

# Wait for both processes
wait
