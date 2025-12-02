#!/bin/bash

# XiPOS Print Server Setup Verification Script

echo "======================================================"
echo "XiPOS Print Server - Setup Verification"
echo "======================================================"
echo ""

SUCCESS="\033[0;32m✓\033[0m"
FAIL="\033[0;31m✗\033[0m"
WARN="\033[0;33m⚠\033[0m"
INFO="\033[0;36mℹ\033[0m"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if server is running
check_server() {
    curl -s http://localhost:3344/health >/dev/null 2>&1
}

echo "1. Checking Prerequisites"
echo "----------------------------------------"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node -v)
    echo -e "${SUCCESS} Node.js installed: ${NODE_VERSION}"
else
    echo -e "${FAIL} Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    echo -e "${SUCCESS} npm installed: ${NPM_VERSION}"
else
    echo -e "${FAIL} npm not found"
    exit 1
fi

echo ""
echo "2. Checking Project Files"
echo "----------------------------------------"

# Check package.json
if [ -f "package.json" ]; then
    echo -e "${SUCCESS} package.json found"
else
    echo -e "${FAIL} package.json not found"
    exit 1
fi

# Check .env file
if [ -f ".env" ]; then
    echo -e "${SUCCESS} .env file found"
else
    echo -e "${WARN} .env file not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${SUCCESS} .env file created. Please configure it."
    else
        echo -e "${FAIL} .env.example not found"
        exit 1
    fi
fi

# Check node_modules
if [ -d "node_modules" ]; then
    echo -e "${SUCCESS} Dependencies installed"
else
    echo -e "${WARN} Dependencies not installed"
    echo -e "${INFO} Run 'npm install' to install dependencies"
fi

# Check source files
if [ -f "src/server.js" ]; then
    echo -e "${SUCCESS} Server files found"
else
    echo -e "${FAIL} Server files not found"
    exit 1
fi

echo ""
echo "3. Checking Configuration"
echo "----------------------------------------"

# Read .env file
if [ -f ".env" ]; then
    PRINTER_TYPE=$(grep "^PRINTER_TYPE=" .env | cut -d'=' -f2 | tr -d ' ')
    STORE_NAME=$(grep "^STORE_NAME=" .env | cut -d'=' -f2 | tr -d ' ')
    PORT=$(grep "^PORT=" .env | cut -d'=' -f2 | tr -d ' ')

    if [ ! -z "$PRINTER_TYPE" ]; then
        echo -e "${SUCCESS} Printer type configured: ${PRINTER_TYPE}"
    else
        echo -e "${WARN} Printer type not configured"
    fi

    if [ ! -z "$STORE_NAME" ]; then
        echo -e "${SUCCESS} Store name configured: ${STORE_NAME}"
    else
        echo -e "${WARN} Store name not configured"
    fi

    if [ ! -z "$PORT" ]; then
        echo -e "${SUCCESS} Port configured: ${PORT}"
    else
        echo -e "${INFO} Using default port: 3344"
    fi
fi

echo ""
echo "4. Checking USB Devices (if using USB printer)"
echo "----------------------------------------"

if command_exists lsusb; then
    echo "USB Devices found:"
    lsusb | grep -i "printer\|epson\|citizen\|star\|bixolon" || echo "No common printer brands found"
else
    echo -e "${WARN} lsusb command not found (normal on some systems)"
fi

echo ""
echo "5. Checking Permissions"
echo "----------------------------------------"

# Check if user is in lp group (Linux)
if groups | grep -q "lp"; then
    echo -e "${SUCCESS} User is in 'lp' group"
else
    echo -e "${WARN} User is not in 'lp' group"
    echo -e "${INFO} Run: sudo usermod -aG lp \$USER"
    echo -e "${INFO} Then log out and log back in"
fi

echo ""
echo "6. Checking Server Status"
echo "----------------------------------------"

if check_server; then
    echo -e "${SUCCESS} Print server is running!"
    HEALTH=$(curl -s http://localhost:3344/health)
    echo "Server response: $HEALTH"
else
    echo -e "${WARN} Print server is not running"
    echo -e "${INFO} Start the server with: npm start"
fi

echo ""
echo "7. Port Availability"
echo "----------------------------------------"

PORT=${PORT:-3344}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${SUCCESS} Port $PORT is in use (server running)"
elif nc -z localhost $PORT 2>/dev/null; then
    echo -e "${WARN} Port $PORT is in use by another process"
else
    echo -e "${SUCCESS} Port $PORT is available"
fi

echo ""
echo "======================================================"
echo "Verification Complete"
echo "======================================================"
echo ""

# Summary
echo "Next Steps:"
echo ""

if [ ! -d "node_modules" ]; then
    echo "1. Install dependencies:"
    echo "   npm install"
    echo ""
fi

if ! check_server; then
    echo "2. Start the server:"
    echo "   npm start (or npm run dev for auto-reload)"
    echo ""
fi

echo "3. Test the printer:"
echo "   curl -X POST http://localhost:3344/test-receipt"
echo ""

echo "4. Check health:"
echo "   curl http://localhost:3344/health"
echo ""

echo "For more information, see:"
echo "  - QUICK_START.md"
echo "  - README.md"
echo "  - ../PRINT_SERVER_SETUP.md"
echo ""
