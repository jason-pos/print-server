#!/bin/bash

# XiPOS Print Server Permission Fix & Restart Script
# This script restarts the print server with proper USB permissions

echo "======================================================"
echo "XiPOS Print Server - Permission Fix & Restart"
echo "======================================================"
echo ""

# Stop any running print server instances
echo "🛑 Stopping existing print server..."
pkill -f "node src/server.js" 2>/dev/null || true
pkill -f "node.*print" 2>/dev/null || true
sleep 2

# Verify user is in lp group
if ! groups | grep -q "lp"; then
    echo "❌ Error: User $USER is not in 'lp' group"
    echo ""
    echo "Please run: sudo usermod -aG lp $USER"
    echo "Then logout and login again, or restart your system"
    exit 1
fi

echo "✓ User is in 'lp' group"

# Check printer device
PRINTER_DEV=$(ls /dev/usb/lp* 2>/dev/null | head -1)
if [ -z "$PRINTER_DEV" ]; then
    echo "⚠️  Warning: No USB printer found at /dev/usb/lp*"
    echo "   Checking USB bus..."
    lsusb | grep -i "print\|0483:5743"
fi

# Check USB device permissions
USB_DEVICE=$(lsusb | grep "0483:5743" | sed 's/.*Bus \([0-9]*\) Device \([0-9]*\).*/\/dev\/bus\/usb\/\1\/\2/')
if [ -n "$USB_DEVICE" ] && [ -e "$USB_DEVICE" ]; then
    echo "✓ Found printer at: $USB_DEVICE"
    ls -l "$USB_DEVICE"
else
    echo "⚠️  Could not find printer USB device"
fi

echo ""
echo "🔄 Starting print server with proper permissions..."
echo ""

# Use sg command to start with lp group permissions
# This ensures the process has the lp group without logging out
cd /opt/lampp/htdocs/008_xipos/sources/xi-print-server

# Method 1: Use sg to run with lp group (recommended)
sg lp -c "npm start" &

sleep 3

# Verify server is running
if curl -s http://localhost:3344/health > /dev/null 2>&1; then
    echo ""
    echo "✅ Print server started successfully!"
    echo ""
    curl -s http://localhost:3344/health | jq '.' 2>/dev/null || curl -s http://localhost:3344/health
    echo ""
    echo "======================================================"
    echo "✓ Print server is now running with proper permissions"
    echo "======================================================"
    echo ""
    echo "Test printing with:"
    echo "  curl -X POST http://localhost:3344/test-receipt"
    echo ""
else
    echo ""
    echo "❌ Failed to start print server"
    echo "Check the logs for errors"
    echo ""
    echo "Manual start command:"
    echo "  sg lp -c 'cd /opt/lampp/htdocs/008_xipos/sources/xi-print-server && npm start'"
fi
