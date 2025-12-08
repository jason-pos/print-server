const { Printer } = require('morden-node-escpos');
const { initPrinter, resetPrinter } = require('./printer.js');
const { formatReceipt } = require('./receipt-formatter.js');
const { config } = require('./config.js');

/**
 * Print receipt
 */
async function printReceipt(orderData) {
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

		// Open adapter and print
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				resetPrinter();
				reject(new Error('Print operation timeout'));
			}, 15000);

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

						// Give it a moment to finish printing, then reset
						setTimeout(() => {
							clearTimeout(timeout);
							// Reset connection for clean state
							resetPrinter();
							resolve({
								success: true,
								message: 'Receipt printed successfully'
							});
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
		throw error;
	}
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
