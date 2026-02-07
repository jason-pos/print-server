const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { config } = require('./config.js');
const { printReceipt, printTest } = require('./print-handler.js');
const { testPrinter, closePrinter, getPrinter } = require('./printer.js');

// Global error handlers for graceful shutdown
let serverInstance = null;

process.on('uncaughtException', (error) => {
	console.error('='.repeat(50));
	console.error('FATAL: Uncaught Exception');
	console.error('='.repeat(50));
	console.error(error);
	console.error('='.repeat(50));
	console.error('Initiating graceful shutdown...');

	// Graceful shutdown sequence
	if (serverInstance) {
		serverInstance.close(() => {
			console.error('HTTP server closed');
			process.exit(1);
		});
	} else {
		process.exit(1);
	}

	// Force exit after 5 seconds if graceful shutdown hangs
	setTimeout(() => {
		console.error('Graceful shutdown timeout - forcing exit');
		process.exit(1);
	}, 5000);
});

process.on('unhandledRejection', (reason, promise) => {
	console.error('='.repeat(50));
	console.error('FATAL: Unhandled Promise Rejection');
	console.error('='.repeat(50));
	console.error('Promise:', promise);
	console.error('Reason:', reason);
	console.error('='.repeat(50));
	console.error('Initiating graceful shutdown...');

	// Graceful shutdown sequence
	if (serverInstance) {
		serverInstance.close(() => {
			console.error('HTTP server closed');
			process.exit(1);
		});
	} else {
		process.exit(1);
	}

	// Force exit after 5 seconds if graceful shutdown hangs
	setTimeout(() => {
		console.error('Graceful shutdown timeout - forcing exit');
		process.exit(1);
	}, 5000);
});

const app = express();

// Middleware
app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'"],
			imgSrc: ["'self'"],
			connectSrc: ["'self'"],
		}
	},
	crossOriginEmbedderPolicy: false
}));
app.use(cors({
	origin: config.cors.origins,
	methods: ['GET', 'POST']
}));
app.use(express.json({ limit: '1mb' }));

// Request logging middleware
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
	next();
});

// Authentication middleware
const authenticateApiKey = (req, res, next) => {
	const apiKey = req.headers['x-api-key'];

	if (!apiKey || apiKey !== config.auth.apiKey) {
		console.warn(`Unauthorized API access attempt from ${req.ip} at ${new Date().toISOString()}`);
		return res.status(401).json({
			error: 'Unauthorized',
			message: 'Invalid or missing API key'
		});
	}

	next();
};

// Rate limiting configuration (centralized in config.js)
const rateLimitWindow = config.rateLimit.windowMs;

// Rate limiter for print endpoint
const printLimiter = rateLimit({
	windowMs: rateLimitWindow,
	max: config.rateLimit.printMax,
	message: {
		success: false,
		error: 'Too many print requests. Please try again later.'
	},
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	handler: (req, res) => {
		const retryAfter = Math.ceil(rateLimitWindow / 1000);
		res.status(429)
			.set('Retry-After', retryAfter.toString())
			.json({
				success: false,
				error: 'Too many print requests. Please try again later.',
				retryAfter: retryAfter
			});
	}
});

// Rate limiter for test endpoints
const testLimiter = rateLimit({
	windowMs: rateLimitWindow,
	max: config.rateLimit.testMax,
	message: {
		success: false,
		error: 'Too many test requests. Please try again later.'
	},
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req, res) => {
		const retryAfter = Math.ceil(rateLimitWindow / 1000);
		res.status(429)
			.set('Retry-After', retryAfter.toString())
			.json({
				success: false,
				error: 'Too many test requests. Please try again later.',
				retryAfter: retryAfter
			});
	}
});

// Health check endpoint
app.get('/health', (req, res) => {
	const printerConnected = !!getPrinter();
	const printerType = config.printer.type || 'none';

	res.json({
		status: printerConnected ? 'ok' : 'degraded',
		timestamp: new Date().toISOString(),
		printer: {
			connected: printerConnected,
			type: printerType
		}
	});
});

// Test printer endpoint
app.get('/test', testLimiter, authenticateApiKey, async (req, res) => {
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
			error: 'Test print failed',
			detail: config.debug ? (error.message || 'Unknown error') : 'Internal error'
		});
	}
});

// Print test receipt endpoint
app.post('/test-receipt', testLimiter, authenticateApiKey, async (req, res) => {
	try {
		const result = await printTest();
		res.json(result);
	} catch (error) {
		console.error('Test receipt failed:', error);
		res.status(500).json({
			success: false,
			error: 'Test receipt failed',
			detail: config.debug ? (error.message || 'Unknown error') : 'Internal error'
		});
	}
});

// Print receipt endpoint
app.post('/print', printLimiter, authenticateApiKey, async (req, res) => {
	try {
		const orderData = req.body;

		// Validate request body exists
		if (!orderData || typeof orderData !== 'object') {
			return res.status(400).json({
				success: false,
				error: 'Invalid request: request body must be a JSON object'
			});
		}

		// Validate required fields
		if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
			return res.status(400).json({
				success: false,
				error: 'Invalid order data: items must be a non-empty array'
			});
		}

		// Validate items array length
		if (orderData.items.length > 100) {
			return res.status(400).json({
				success: false,
				error: 'Too many items. Maximum 100 items per order.'
			});
		}

		// Validate each item has valid fields
		for (let i = 0; i < orderData.items.length; i++) {
			const item = orderData.items[i];
			if (!item || typeof item !== 'object') {
				return res.status(400).json({
					success: false,
					error: `Invalid item at index ${i}: must be an object`
				});
			}
			if (typeof item.quantity !== 'undefined' && (typeof item.quantity !== 'number' || item.quantity < 0)) {
				return res.status(400).json({
					success: false,
					error: `Invalid item at index ${i}: quantity must be a non-negative number`
				});
			}
			const sellPrice = item.sell_price !== undefined ? item.sell_price : item.price;
			if (sellPrice !== undefined && (typeof sellPrice !== 'number' || sellPrice < 0)) {
				return res.status(400).json({
					success: false,
					error: `Invalid item at index ${i}: sell_price must be a non-negative number`
				});
			}
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
			error: 'Print receipt failed',
			detail: config.debug ? (error.message || 'Unknown error') : 'Internal error'
		});
	}
});

// Error handling middleware
app.use((error, req, res, _next) => {
	// Handle payload too large error
	if (error.type === 'entity.too.large') {
		console.error('Payload too large:', error.message);
		return res.status(413).json({
			success: false,
			error: 'Request payload too large. Maximum size is 1MB.'
		});
	}

	console.error('Server error:', error);
	res.status(500).json({
		success: false,
		error: 'Internal server error'
	});
});

// Start server
const server = serverInstance = app.listen(config.server.port, config.server.host, () => {
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
const gracefulShutdown = async (signal) => {
	console.log(`${signal} received, shutting down gracefully...`);
	try {
		await closePrinter();
		console.log('Printer connection closed');
	} catch (err) {
		console.error('Error closing printer:', err.message);
	}
	server.close(() => {
		console.log('Server closed');
		process.exit(0);
	});
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('\nSIGINT'));
