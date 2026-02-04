const { Printer, USBAdapter } = require('morden-node-escpos');
const { config } = require('./config.js');
const {
	PRINTER_CLOSE_TIMEOUT,
	TEST_PRINT_TIMEOUT,
	POST_PRINT_DELAY
} = require('./constants.js');

let printerAdapter = null;
let isInitialized = false;
let initializationPromise = null;

/**
 * Initialize printer adapter based on configuration
 * Uses singleton pattern to reuse connection
 */
async function initPrinter() {
	// If already initialized and adapter exists, return it
	if (isInitialized && printerAdapter) {
		return printerAdapter;
	}

	// If initialization is in progress, wait for it
	if (initializationPromise) {
		return initializationPromise;
	}

	initializationPromise = (async () => {
		try {
			if (config.printer.type === 'usb') {
				// USB printer
				// Find available printers
				const devices = USBAdapter.findPrinter();

				if (!devices || devices.length === 0) {
					throw new Error('No USB printer found');
				}

				console.log('Found USB printers:', devices);

				// Use first available printer or specified vendor/product ID
				if (config.printer.usb.vendorId && config.printer.usb.productId) {
					printerAdapter = new USBAdapter(
						parseInt(config.printer.usb.vendorId, 16),
						parseInt(config.printer.usb.productId, 16)
					);
				} else {
					// Auto-connect to first printer
					printerAdapter = new USBAdapter();
				}

				isInitialized = true;
				console.log('✓ USB printer adapter initialized');
			} else {
				throw new Error(`Unsupported printer type: ${config.printer.type}. Only USB printers are supported. Please set PRINTER_TYPE=usb in your .env file.`);
			}

			return printerAdapter;
		} catch (error) {
			console.error('Failed to initialize printer:', error.message);
			isInitialized = false;
			printerAdapter = null;
			throw error;
		} finally {
			initializationPromise = null;
		}
	})();

	return initializationPromise;
}

/**
 * Get current printer adapter
 */
function getPrinter() {
	return printerAdapter;
}

/**
 * Reset printer connection (for recovery after errors)
 */
function resetPrinter() {
	console.log('Resetting printer connection...');
	isInitialized = false;
	if (printerAdapter) {
		try {
			printerAdapter.close(() => {
				console.log('Previous connection closed');
			});
		} catch (e) {
			// Ignore close errors during reset
			console.log('Close error during reset (ignored):', e.message);
		}
	}
	printerAdapter = null;
	initializationPromise = null;
}

/**
 * Close printer connection
 */
async function closePrinter() {
	if (printerAdapter) {
		try {
			await new Promise((resolve) => {
				const timeout = setTimeout(() => {
					console.log('Printer close timeout, forcing close');
					resolve();
				}, PRINTER_CLOSE_TIMEOUT);

				try {
					printerAdapter.close(() => {
						clearTimeout(timeout);
						console.log('✓ Printer connection closed');
						resolve();
					});
				} catch (e) {
					clearTimeout(timeout);
					console.error('Error in close callback:', e.message);
					resolve();
				}
			});
		} catch (error) {
			console.error('Error closing printer:', error.message);
		} finally {
			printerAdapter = null;
			isInitialized = false;
		}
	}
}

/**
 * Promise wrapper for adapter.open()
 */
function openAdapter(adapter) {
	return new Promise((resolve, reject) => {
		adapter.open((error) => {
			if (error) {
				reject(new Error(`Failed to open printer: ${error.message}`));
			} else {
				resolve();
			}
		});
	});
}

/**
 * Test printer connection
 */
async function testPrinter() {
	try {
		const adapter = await initPrinter();

		// Create timeout promise with clearable timer
		let timeoutId;
		const timeoutPromise = new Promise((_, reject) => {
			timeoutId = setTimeout(() => {
				resetPrinter();
				reject(new Error('Printer operation timeout'));
			}, TEST_PRINT_TIMEOUT);
		});

		// Create print operation promise
		const printOperation = async () => {
			try {
				// Open adapter with async/await
				await openAdapter(adapter);

				const printer = new Printer(adapter, {
					encoding: config.receipt?.encoding || 'GB18030',
					width: config.receipt.paperWidth
				});

				// Print test content
				printer
					.align('ct')
					.size(2, 2)
					.text('TEST PRINT')
					.size(1, 1)
					.feed(1)
					.text('Printer is working!')
					.text('打印机工作正常!')
					.feed(2)
					.cut()
					.close();

				// Give it a moment to print
				await new Promise(resolve => setTimeout(resolve, POST_PRINT_DELAY));

				// Reset after print to ensure clean state for next print
				resetPrinter();
				return true;
			} catch (error) {
				resetPrinter();
				throw error;
			}
		};

		// Race between print operation and timeout
		return await Promise.race([
			printOperation().then(res => { clearTimeout(timeoutId); return res; }),
			timeoutPromise
		]);
	} catch (error) {
		resetPrinter();
		throw new Error(`Printer test failed: ${error.message}`);
	}
}

module.exports = {
	initPrinter,
	getPrinter,
	closePrinter,
	testPrinter,
	resetPrinter,
	openAdapter
};
