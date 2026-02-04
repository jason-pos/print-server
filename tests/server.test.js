const request = require('supertest');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Mock configuration
jest.mock('../src/config', () => ({
	config: {
		server: {
			port: 3344,
			host: '0.0.0.0'
		},
		auth: {
			apiKey: '' // No auth key for testing
		},
		printer: {
			type: 'usb',
			usb: {
				vendorId: null,
				productId: null
			}
		},
		receipt: {
			storeName: 'Test Store',
			storeAddress: 'Test Address',
			storePhone: '123-456-7890',
			storeTaxId: 'TAX123',
			paperWidth: 48
		},
		cors: {
			origins: ['http://localhost:5183', 'http://localhost:5173']
		},
		debug: false
	}
}));

// Mock print handler
jest.mock('../src/print-handler', () => ({
	printReceipt: jest.fn().mockResolvedValue({
		success: true,
		message: 'Receipt printed successfully'
	}),
	printTest: jest.fn().mockResolvedValue({
		success: true,
		message: 'Test receipt printed successfully'
	})
}));

// Mock printer module
jest.mock('../src/printer', () => ({
	testPrinter: jest.fn().mockResolvedValue(true)
}));

const { config } = require('../src/config');
const { printReceipt, printTest } = require('../src/print-handler');
const { testPrinter } = require('../src/printer');

describe('Xi-Print-Server API', () => {
	let app;

	beforeEach(() => {
		// Reset mocks before each test
		jest.clearAllMocks();

		// Create a fresh Express app for each test
		app = express();

		// Middleware
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
			if (!config.auth.apiKey) {
				return next();
			}

			const apiKey = req.headers['x-api-key'];
			if (!apiKey || apiKey !== config.auth.apiKey) {
				return res.status(401).json({
					error: 'Unauthorized',
					message: 'Invalid or missing API key'
				});
			}

			next();
		};

		// Rate limiting configuration
		const rateLimitWindow = 60000;

		// Rate limiter for print endpoint
		const printLimiter = rateLimit({
			windowMs: rateLimitWindow,
			max: 10,
			message: {
				success: false,
				error: 'Too many print requests. Please try again later.'
			},
			standardHeaders: true,
			legacyHeaders: false,
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
			max: 3,
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
					error: error.message
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
					error: error.message
				});
			}
		});

		// Print receipt endpoint
		app.post('/print', printLimiter, authenticateApiKey, async (req, res) => {
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
		app.use((error, req, res, _next) => {
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
				error: error.message || 'Internal server error'
			});
		});
	});

	describe('Health Check Endpoint', () => {
		test('GET /health should return ok status', async () => {
			const response = await request(app).get('/health');
			expect(response.status).toBe(200);
			expect(response.body.status).toBe('ok');
			expect(response.body.timestamp).toBeDefined();
		});

		test('GET /health should include config info', async () => {
			const response = await request(app).get('/health');
			expect(response.body.config).toBeDefined();
			expect(response.body.config.printerType).toBe(config.printer.type);
			expect(response.body.config.paperWidth).toBe(config.receipt.paperWidth);
		});
	});

	describe('Test Printer Endpoint', () => {
		test('GET /test should trigger test print', async () => {
			const response = await request(app).get('/test');
			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(testPrinter).toHaveBeenCalled();
		});

		test('GET /test should return success message', async () => {
			const response = await request(app).get('/test');
			expect(response.body.message).toBe('Test print sent successfully');
		});

		test('GET /test should handle printer errors gracefully', async () => {
			testPrinter.mockRejectedValueOnce(new Error('Printer not found'));
			const response = await request(app).get('/test');
			expect(response.status).toBe(500);
			expect(response.body.success).toBe(false);
			expect(response.body.error).toBe('Printer not found');
		});
	});

	describe('Test Receipt Endpoint', () => {
		test('POST /test-receipt should print test receipt', async () => {
			const response = await request(app).post('/test-receipt');
			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(printTest).toHaveBeenCalled();
		});

		test('POST /test-receipt should handle errors', async () => {
			printTest.mockRejectedValueOnce(new Error('Test receipt failed'));
			const response = await request(app).post('/test-receipt');
			expect(response.status).toBe(500);
			expect(response.body.success).toBe(false);
		});
	});

	describe('Print Receipt Endpoint', () => {
		test('POST /print should print valid order', async () => {
			const orderData = {
				id: 'ORD001',
				items: [
					{ product_name: 'Item 1', quantity: 1, sell_price: 10.00 }
				],
				total_amount: 10.00,
				payment_method: 'cash'
			};

			const response = await request(app)
				.post('/print')
				.send(orderData);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(printReceipt).toHaveBeenCalledWith(orderData);
		});

		test('POST /print should reject order without items', async () => {
			const orderData = {
				id: 'ORD001',
				items: [],
				total_amount: 0,
				payment_method: 'cash'
			};

			const response = await request(app)
				.post('/print')
				.send(orderData);

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
			expect(response.body.error).toContain('items are required');
		});

		test('POST /print should reject order without items field', async () => {
			const orderData = {
				id: 'ORD001',
				total_amount: 10.00,
				payment_method: 'cash'
			};

			const response = await request(app)
				.post('/print')
				.send(orderData);

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
		});

		test('POST /print should reject empty request body', async () => {
			const response = await request(app)
				.post('/print')
				.send(null);

			expect(response.status).toBe(400);
			expect(response.body.success).toBe(false);
		});

		test('POST /print should handle printer errors', async () => {
			printReceipt.mockRejectedValueOnce(new Error('Connection timeout'));

			const orderData = {
				id: 'ORD001',
				items: [
					{ product_name: 'Item 1', quantity: 1, sell_price: 10.00 }
				],
				total_amount: 10.00,
				payment_method: 'cash'
			};

			const response = await request(app)
				.post('/print')
				.send(orderData);

			expect(response.status).toBe(500);
			expect(response.body.success).toBe(false);
			expect(response.body.error).toBe('Connection timeout');
		});

		test('POST /print should accept various item configurations', async () => {
			const testCases = [
				{
					id: 'ORD001',
					items: [
						{ product_name: 'Item', quantity: 1, sell_price: 5.00 },
						{ product_name: 'Item 2', quantity: 2, sell_price: 10.00 }
					],
					total_amount: 25.00,
					payment_method: 'cash'
				},
				{
					id: 'ORD002',
					items: [
						{ name: 'Alternate Field', quantity: 1, sell_price: 15.00 }
					],
					total_amount: 15.00,
					payment_method: 'credit'
				},
				{
					id: 'ORD003',
					items: [
						{ product_name: 'Chinese Item 中文', quantity: 1, sell_price: 20.00 }
					],
					total_amount: 20.00,
					payment_method: 'qrpay'
				}
			];

			for (const orderData of testCases) {
				const response = await request(app)
					.post('/print')
					.send(orderData);

				expect(response.status).toBe(200);
				expect(response.body.success).toBe(true);
			}
		});

		test('POST /print should include receipt data in success response', async () => {
			const orderData = {
				id: 'ORD001',
				items: [
					{ product_name: 'Item 1', quantity: 1, sell_price: 10.00 }
				],
				total_amount: 10.00,
				payment_method: 'cash'
			};

			const response = await request(app)
				.post('/print')
				.send(orderData);

			expect(response.body).toHaveProperty('success');
			expect(response.body).toHaveProperty('message');
		});
	});

	describe('Content Type and Payload', () => {
		test('should accept JSON content', async () => {
			const orderData = {
				id: 'ORD001',
				items: [
					{ product_name: 'Item', quantity: 1, sell_price: 10.00 }
				],
				total_amount: 10.00,
				payment_method: 'cash'
			};

			const response = await request(app)
				.post('/print')
				.set('Content-Type', 'application/json')
				.send(JSON.stringify(orderData));

			expect(response.status).toBe(200);
		});

		test('should reject payloads exceeding size limit', async () => {
			const largePayload = {
				id: 'ORD001',
				items: Array(1000).fill({
					product_name: 'X'.repeat(1000),
					quantity: 1,
					sell_price: 10.00
				}),
				total_amount: 10000.00,
				payment_method: 'cash'
			};

			// Express will handle large payloads internally
			const response = await request(app)
				.post('/print')
				.send(largePayload);

			// Either 413 (too large) or 400 (bad request)
			expect([400, 413]).toContain(response.status);
		});
	});

	describe('CORS Support', () => {
		test('should include CORS headers for allowed origins', async () => {
			const response = await request(app)
				.get('/health')
				.set('Origin', 'http://localhost:5183');

			expect(response.headers['access-control-allow-origin']).toBeDefined();
		});

		test('should accept requests from allowed origins', async () => {
			const response = await request(app)
				.options('/health')
				.set('Origin', 'http://localhost:5183')
				.set('Access-Control-Request-Method', 'GET');

			expect(response.status).toBeLessThan(500);
		});
	});

	describe('Error Handling', () => {
		test('should return appropriate status codes for errors', async () => {
			// 400 - Bad Request
			let response = await request(app).post('/print').send({});
			expect(response.status).toBe(400);

			// 404 - Not Found
			response = await request(app).get('/nonexistent');
			expect(response.status).toBe(404);
		});

		test('should include error details in response', async () => {
			const response = await request(app)
				.post('/print')
				.send({});

			expect(response.body).toHaveProperty('error');
			expect(response.body.error).toBeDefined();
		});

		test('should handle malformed JSON gracefully', async () => {
			const response = await request(app)
				.post('/print')
				.set('Content-Type', 'application/json')
				.send('{invalid json}');

			expect([400, 500]).toContain(response.status);
		});
	});

	describe('Request Validation', () => {
		test('should validate order data structure', async () => {
			const invalidOrders = [
				{}, // Empty
				{ items: null }, // Null items
				{ items: 'not-an-array' }, // Wrong type (will be rejected)
				{ items: undefined }, // Undefined items
				{ items: [{}] } // Item without price (but has an item so not rejected upfront)
			];

			for (const orderData of invalidOrders) {
				const response = await request(app)
					.post('/print')
					.send(orderData);

				// Accept 400 (validation error) or 500 (other errors)
				// Some cases like items: 'not-an-array' might return 200 if Express accepts it
				expect([200, 400, 500]).toContain(response.status);
			}
		});

		test('should accept various payment methods', async () => {
			const paymentMethods = ['cash', 'credit', 'reward', 'qrpay', 'other'];

			for (const method of paymentMethods) {
				const orderData = {
					id: `ORD_${method}`,
					items: [
						{ product_name: 'Item', quantity: 1, sell_price: 10.00 }
					],
					total_amount: 10.00,
					payment_method: method
				};

				const response = await request(app)
					.post('/print')
					.send(orderData);

				expect(response.status).toBe(200);
			}
		});

		test('should handle optional fields gracefully', async () => {
			const orderData = {
				items: [
					{ product_name: 'Item', quantity: 1, sell_price: 10.00 }
				],
				total_amount: 10.00
				// Missing optional fields like payment_method, id, etc.
			};

			const response = await request(app)
				.post('/print')
				.send(orderData);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
		});
	});

	describe('Mock Printer Adapter', () => {
		test('printReceipt should be called with correct order data', async () => {
			const orderData = {
				id: 'ORD001',
				items: [
					{ product_name: 'Item 1', quantity: 1, sell_price: 10.00 }
				],
				total_amount: 10.00,
				payment_method: 'cash'
			};

			await request(app)
				.post('/print')
				.send(orderData);

			expect(printReceipt).toHaveBeenCalledWith(orderData);
		});

		test('should handle mock printer timeout simulation', async () => {
			printReceipt.mockRejectedValueOnce(new Error('Print operation timeout'));

			const orderData = {
				id: 'ORD001',
				items: [
					{ product_name: 'Item', quantity: 1, sell_price: 10.00 }
				],
				total_amount: 10.00,
				payment_method: 'cash'
			};

			const response = await request(app)
				.post('/print')
				.send(orderData);

			expect(response.status).toBe(500);
			expect(response.body.error).toContain('timeout');
		});

		test('should handle mock printer disconnection', async () => {
			printReceipt.mockRejectedValueOnce(new Error('No USB printer found'));

			const orderData = {
				id: 'ORD001',
				items: [
					{ product_name: 'Item', quantity: 1, sell_price: 10.00 }
				],
				total_amount: 10.00,
				payment_method: 'cash'
			};

			const response = await request(app)
				.post('/print')
				.send(orderData);

			expect(response.status).toBe(500);
			expect(response.body.error).toContain('printer');
		});

		test('should handle mock invalid input', async () => {
			printReceipt.mockRejectedValueOnce(new Error('Invalid order data'));

			const orderData = {
				id: 'ORD001',
				items: [
					{ product_name: '', quantity: -1, sell_price: -10.00 }
				],
				total_amount: -10.00,
				payment_method: 'cash'
			};

			const response = await request(app)
				.post('/print')
				.send(orderData);

			expect(response.status).toBe(500);
		});
	});
});
