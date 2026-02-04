const { Printer } = require('morden-node-escpos');
const { initPrinter, resetPrinter, openAdapter } = require('./printer.js');
const { formatReceipt } = require('./receipt-formatter.js');
const { config } = require('./config.js');
const {
	RECEIPT_PRINT_TIMEOUT,
	POST_PRINT_DELAY,
	RETRY_BASE_DELAY,
	MAX_RETRY_ATTEMPTS
} = require('./constants.js');

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determine if error is transient (retryable) or permanent
 */
function isTransientError(error) {
	const message = error.message.toLowerCase();

	// Transient errors that can be retried
	const transientPatterns = [
		'timeout',
		'busy',
		'eagain',
		'ebusy',
		'failed to open',
		'connection',
		'i/o error'
	];

	return transientPatterns.some(pattern => message.includes(pattern));
}

/**
 * Retry wrapper with exponential backoff
 * @param {Function} operation - Async operation to retry
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @param {string} operationName - Name for logging
 */
async function retryWithBackoff(operation, maxRetries = 3, operationName = 'operation') {
	let lastError;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			if (attempt > 0) {
				const delay = Math.pow(2, attempt - 1) * RETRY_BASE_DELAY; // 1s, 2s, 4s
				console.log(`[Retry ${attempt}/${maxRetries}] Retrying ${operationName} after ${delay}ms delay...`);
				console.log(`[Retry ${attempt}/${maxRetries}] Previous error: ${lastError.message}`);

				// Reset printer connection before retry
				resetPrinter();

				// Wait before retry
				await sleep(delay);
			}

			// Execute operation
			const result = await operation();

			if (attempt > 0) {
				console.log(`[Retry ${attempt}/${maxRetries}] ${operationName} succeeded after retry`);
			}

			return result;
		} catch (error) {
			lastError = error;

			// Check if error is permanent (non-retryable)
			if (!isTransientError(error)) {
				console.error(`[Retry] Permanent error detected, not retrying: ${error.message}`);
				throw error;
			}

			// If we've exhausted retries, throw the last error
			if (attempt === maxRetries) {
				console.error(`[Retry] Max retries (${maxRetries}) reached for ${operationName}`);
				throw new Error(`Print operation failed after ${maxRetries} retries: ${lastError.message}`);
			}
		}
	}
}

/**
 * Core print operation (without retry logic)
 */
async function printReceiptCore(orderData) {
	let adapter = null;

	try {
		// Initialize printer
		adapter = await initPrinter();

		// Format receipt content
		const receiptLines = formatReceipt(orderData);

		if (config.debug) {
			console.log('Receipt content:');
			console.log(receiptLines.join('\n'));
		}

		// Create timeout promise with clearable timer
		let timeoutId;
		const timeoutPromise = new Promise((_, reject) => {
			timeoutId = setTimeout(() => {
				resetPrinter();
				reject(new Error('Print operation timeout'));
			}, RECEIPT_PRINT_TIMEOUT);
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

				// Print each line
				receiptLines.forEach(line => {
					// Check if line should be centered (headers, footers)
					if (line.includes('='.repeat(10)) ||
						line.includes('Thank you') ||
						line.includes('Please come') ||
						(config.receipt.storeName && line.includes(config.receipt.storeName))) {
						printer.align('ct').text(line);
					} else if (line.startsWith('TOTAL:') || line.startsWith('Subtotal:')) {
						// Use 'b' for bold style
						printer.align('lt').style('b').text(line).style('normal');
					} else {
						printer.align('lt').text(line);
					}
				});

				// Cut paper and close
				printer
					.feed(2)
					.cut()
					.close();

				// Give it a moment to finish printing
				await new Promise(resolve => setTimeout(resolve, POST_PRINT_DELAY));

				// Reset connection for clean state
				resetPrinter();

				return {
					success: true,
					message: 'Receipt printed successfully'
				};
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
		throw error;
	}
}

/**
 * Print receipt with retry mechanism
 * This is the main entry point for printing
 */
async function printReceipt(orderData) {
	return retryWithBackoff(
		() => printReceiptCore(orderData),
		MAX_RETRY_ATTEMPTS,
		'printReceipt'
	);
}

/**
 * Print test receipt
 */
async function printTest() {
	const testData = {
		id: 'TEST001',
		receipt_number: 'TEST001',
		created_at: new Date().toISOString(),
		cashier_name: 'Test Cashier',
		cashier_name_chinese: '测试收银员',
		items: [
			{
				product_name: 'Test Product 1',
				quantity: 2,
				sell_price: 10.50
			},
			{
				product_name: 'Test Product 2',
				quantity: 1,
				sell_price: 25.00
			}
		],
		subtotal: 46.00,
		tax: 0,
		discount: 0,
		total_amount: 46.00,
		payment_method: 'cash',
		payment_amount: 50.00
	};

	return printReceipt(testData);
}

module.exports = {
	printReceipt,
	printTest
};
