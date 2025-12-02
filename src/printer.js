const { Printer, USBAdapter } = require('morden-node-escpos');
const { config } = require('./config.js');

let printerAdapter = null;

/**
 * Initialize printer adapter based on configuration
 */
async function initPrinter() {
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

			console.log('✓ USB printer adapter initialized');
		} else if (config.printer.type === 'network') {
			throw new Error('Network printer not yet supported with morden-node-escpos. Please use USB printer or contribute network adapter support.');
		} else {
			throw new Error(`Unsupported printer type: ${config.printer.type}`);
		}

		return printerAdapter;
	} catch (error) {
		console.error('Failed to initialize printer:', error.message);
		throw error;
	}
}

/**
 * Get current printer adapter
 */
function getPrinter() {
	return printerAdapter;
}

/**
 * Close printer connection
 */
async function closePrinter() {
	if (printerAdapter) {
		try {
			await new Promise((resolve) => {
				printerAdapter.close(() => {
					console.log('✓ Printer connection closed');
					resolve();
				});
			});
			printerAdapter = null;
		} catch (error) {
			console.error('Error closing printer:', error.message);
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
			adapter.open(function(error) {
				if (error) {
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

					// Give it a moment to print
					setTimeout(() => resolve(true), 500);
				} catch (printError) {
					reject(new Error(`Printing failed: ${printError.message}`));
				}
			});
		});
	} catch (error) {
		throw new Error(`Printer test failed: ${error.message}`);
	}
}

module.exports = {
	initPrinter,
	getPrinter,
	closePrinter,
	testPrinter
};
