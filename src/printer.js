const { Printer, USBAdapter } = require('morden-node-escpos');
const { config } = require('./config.js');

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
			} else if (config.printer.type === 'network') {
				throw new Error('Network printer not yet supported with morden-node-escpos. Please use USB printer or contribute network adapter support.');
			} else {
				throw new Error(`Unsupported printer type: ${config.printer.type}`);
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
				}, 2000);

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
 * Test printer connection
 */
async function testPrinter() {
	try {
		const adapter = await initPrinter();

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				resetPrinter();
				reject(new Error('Printer operation timeout'));
			}, 10000);

			try {
				adapter.open(function(error) {
					if (error) {
						clearTimeout(timeout);
						resetPrinter();
						reject(new Error(`Failed to open printer: ${error.message}`));
						return;
					}

					const printer = new Printer(adapter, {
						encoding: 'GB18030',
						width: config.receipt.paperWidth
					});

					try {
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

						// Give it a moment to print, then reset connection
						setTimeout(() => {
							clearTimeout(timeout);
							// Reset after print to ensure clean state for next print
							resetPrinter();
							resolve(true);
						}, 1000);
					} catch (printError) {
						clearTimeout(timeout);
						resetPrinter();
						reject(new Error(`Printing failed: ${printError.message}`));
					}
				});
			} catch (openError) {
				clearTimeout(timeout);
				resetPrinter();
				reject(new Error(`Failed to open adapter: ${openError.message}`));
			}
		});
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
	resetPrinter
};
