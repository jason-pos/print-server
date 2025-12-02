#!/bin/bash

# XiPOS Print Server Startup Script (Docker Mode)
#
# NOTE: This script can be used to start the print server independently.
# However, it's recommended to use the main start.sh script in the parent
# directory to start all XiPOS services together.
#
# Usage: ./start.sh (from xi-print-server directory)
# Or:    ../start.sh (from sources directory - starts all services)

set -e

echo "======================================================"
echo "Starting XiPOS Print Server (Docker)"
echo "======================================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed!"
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

# Use docker compose or docker-compose
DOCKER_COMPOSE="docker compose"
if ! docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "✓ .env file created. Please configure it before running the server."
    echo ""
    echo "Edit .env and configure:"
    echo "  - PRINTER_TYPE (usb or network)"
    echo "  - STORE_NAME"
    echo "  - PAPER_WIDTH"
    echo ""
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if container is already running
if docker ps | grep -q xi-print-server; then
    echo "⚠️  Print server container is already running."
    echo ""
    read -p "Do you want to restart it? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Restarting container..."
        $DOCKER_COMPOSE restart
        echo ""
        echo "✅ Container restarted successfully!"
    else
        echo "ℹ️  Keeping existing container running."
    fi
else
    # Check if container exists but stopped
    if docker ps -a | grep -q xi-print-server; then
        echo "🔄 Starting existing container..."
        $DOCKER_COMPOSE start
    else
        # Build and start new container
        echo "🏗️  Building Docker image..."
        $DOCKER_COMPOSE build
        echo ""
        echo "🚀 Starting print server container..."
        $DOCKER_COMPOSE up -d
    fi

    echo ""
    echo "✅ Print server started successfully!"
fi

echo ""
echo "======================================================"
echo "📊 Container Status:"
echo "======================================================"
$DOCKER_COMPOSE ps
echo ""

echo "======================================================"
echo "📝 Useful Commands:"
echo "======================================================"
echo "View logs:        $DOCKER_COMPOSE logs -f"
echo "Stop server:      $DOCKER_COMPOSE stop"
echo "Restart server:   $DOCKER_COMPOSE restart"
echo "Remove container: $DOCKER_COMPOSE down"
echo "Rebuild image:    $DOCKER_COMPOSE build --no-cache"
echo ""
echo "Server URL: http://localhost:3344"
echo "Health check: curl http://localhost:3344/health"
echo "======================================================"
