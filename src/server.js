const express = require('express');
const cors = require('cors');
const { config } = require('./config.js');
const { printReceipt, printTest } = require('./print-handler.js');
const { testPrinter } = require('./printer.js');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
	next();
});

// Health check endpoint
app.get('/health', (req, res) => {
	res.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		config: {
			printerType: config.printer.type,
			paperWidth: config.receipt.paperWidth
		}
	});
});

// Test printer endpoint
app.get('/test', async (req, res) => {
	try {
		await testPrinter();
		res.json({
			success: true,
			message: 'Test print sent successfully'
		});
	} catch (error) {
		console.error('Test print failed:', error);
		res.status(500).json({
			success: false,
			error: error.message
		});
	}
});

// Print test receipt endpoint
app.post('/test-receipt', async (req, res) => {
	try {
		const result = await printTest();
		res.json(result);
	} catch (error) {
		console.error('Test receipt failed:', error);
		res.status(500).json({
			success: false,
			error: error.message
		});
	}
});

// Print receipt endpoint
app.post('/print', async (req, res) => {
	try {
		const orderData = req.body;

		// Validate required fields
		if (!orderData || !orderData.items || orderData.items.length === 0) {
			return res.status(400).json({
				success: false,
				error: 'Invalid order data: items are required'
			});
		}

		if (config.debug) {
			console.log('Received print request:', JSON.stringify(orderData, null, 2));
		}

		const result = await printReceipt(orderData);
		res.json(result);
	} catch (error) {
		console.error('Print failed:', error);
		res.status(500).json({
			success: false,
			error: error.message
		});
	}
});

// Error handling middleware
app.use((error, req, res, next) => {
	console.error('Server error:', error);
	res.status(500).json({
		success: false,
		error: error.message || 'Internal server error'
	});
});

// Start server
const server = app.listen(config.server.port, config.server.host, () => {
	console.log('\n' + '='.repeat(50));
	console.log('🖨️  XiPOS Print Server');
	console.log('='.repeat(50));
	console.log(`Server running at http://${config.server.host}:${config.server.port}`);
	console.log(`Printer type: ${config.printer.type}`);
	console.log(`Paper width: ${config.receipt.paperWidth} characters`);
	console.log('='.repeat(50));
	console.log('\nEndpoints:');
	console.log(`  GET  /health        - Health check`);
	console.log(`  GET  /test          - Test printer connection`);
	console.log(`  POST /test-receipt  - Print test receipt`);
	console.log(`  POST /print         - Print receipt`);
	console.log('='.repeat(50) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
	console.log('SIGTERM received, shutting down gracefully...');
	server.close(() => {
		console.log('Server closed');
		process.exit(0);
	});
});

process.on('SIGINT', () => {
	console.log('\nSIGINT received, shutting down gracefully...');
	server.close(() => {
		console.log('Server closed');
		process.exit(0);
	});
});
