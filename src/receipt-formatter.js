const { config } = require('./config.js');

/**
 * Format text to fit within paper width
 */
function fitText(text, width) {
	if (text.length > width) {
		return text.substring(0, width);
	}
	return text;
}

/**
 * Pad text to center
 */
function centerText(text, width) {
	const padding = Math.max(0, Math.floor((width - text.length) / 2));
	return ' '.repeat(padding) + text;
}

/**
 * Create a line with left and right aligned text
 */
function createLine(left, right, width) {
	const spaces = width - left.length - right.length;
	if (spaces < 0) {
		// If combined text is too long, truncate left text
		return fitText(left, width - right.length - 1) + ' ' + right;
	}
	return left + ' '.repeat(spaces) + right;
}

/**
 * Format currency
 */
function formatCurrency(amount) {
	const currencySymbol = config.receipt?.currencySymbol || 'RM';
	return currencySymbol + ' ' + parseFloat(amount).toFixed(2);
}

/**
 * Format date and time
 */
function formatDateTime(dateString) {
	const date = dateString ? new Date(dateString) : new Date();
	return {
		date: date.toLocaleDateString('en-MY'),
		time: date.toLocaleTimeString('en-MY', { hour12: false })
	};
}

/**
 * Generate receipt content from order data
 */
function formatReceipt(orderData) {
	const width = config.receipt.paperWidth;
	const lines = [];
	const separator = '='.repeat(width);
	const dashed = '-'.repeat(width);

	// Store header
	if (config.receipt.storeName) {
		lines.push(centerText(config.receipt.storeName.toUpperCase(), width));
	}
	if (config.receipt.storeAddress) {
		lines.push(centerText(config.receipt.storeAddress, width));
	}
	if (config.receipt.storePhone) {
		lines.push(centerText(config.receipt.storePhone, width));
	}
	if (config.receipt.storeTaxId) {
		lines.push(centerText(`Tax ID: ${config.receipt.storeTaxId}`, width));
	}
	lines.push(separator);

	// Receipt info
	const { date, time } = formatDateTime(orderData.created_at);
	lines.push(createLine('Receipt #:', orderData.receipt_number || orderData.id || 'N/A', width));
	lines.push(createLine('Date:', date, width));
	lines.push(createLine('Time:', time, width));

	if (orderData.cashier_name) {
		lines.push(createLine('Cashier:', orderData.cashier_name, width));
	}

	if (orderData.customer_name) {
		lines.push(createLine('Customer:', orderData.customer_name, width));
	}

	lines.push(separator);

	// Items header
	lines.push('ITEMS:');
	lines.push(dashed);

	// Items
	const items = orderData.items || [];
	items.forEach((item, index) => {
		const itemName = fitText(item.product_name || item.name || `Item ${index + 1}`, width);
		lines.push(itemName);

		const qty = parseFloat(item.quantity || 1) || 1;
		const price = parseFloat(item.sell_price || 0) || 0;
		const total = qty * price;

		const qtyText = `${qty} x ${formatCurrency(price)}`;
		const totalText = formatCurrency(total);

		lines.push(createLine(qtyText, totalText, width));

		// Add spacing between items
		if (index < items.length - 1) {
			lines.push('');
		}
	});

	lines.push(dashed);

	// Totals
	const subtotal = parseFloat(orderData.subtotal || orderData.total_amount || 0);
	lines.push(createLine('Subtotal:', formatCurrency(subtotal), width));

	if (orderData.tax && parseFloat(orderData.tax) > 0) {
		lines.push(createLine('Tax:', formatCurrency(orderData.tax), width));
	}

	if (orderData.discount && parseFloat(orderData.discount) > 0) {
		lines.push(createLine('Discount:', formatCurrency(orderData.discount), width));
	}

	const total = parseFloat(orderData.total_amount || subtotal);
	lines.push(separator);
	lines.push(createLine('TOTAL:', formatCurrency(total), width));
	lines.push(separator);

	// Payment info
	const paymentMethod = orderData.payment_method || 'N/A';
	const paymentMethodNames = {
		cash: 'Cash',
		credit: 'Member Credit',
		reward: 'Reward Points',
		qrpay: 'QR Pay'
	};
	lines.push(createLine('Payment:', paymentMethodNames[paymentMethod] || paymentMethod, width));

	if (orderData.payment_amount) {
		const paid = parseFloat(orderData.payment_amount);
		lines.push(createLine('Paid:', formatCurrency(paid), width));

		if (paymentMethod === 'cash' && paid > total) {
			const change = paid - total;
			lines.push(createLine('Change:', formatCurrency(change), width));
		}
	}

	// Payment details (for member/reward)
	if (orderData.payment_data) {
		if (orderData.payment_data.member_name) {
			lines.push(dashed);
			lines.push(`Member: ${orderData.payment_data.member_name}`);
			if (orderData.payment_data.member_code) {
				lines.push(`Code: ${orderData.payment_data.member_code}`);
			}
		}
	}

	lines.push(separator);

	// Footer
	lines.push('');
	const footerLine1 = config.receipt?.footerLine1 || 'Thank you for your purchase!';
	const footerLine2 = config.receipt?.footerLine2 || 'Please come again';
	lines.push(centerText(footerLine1, width));
	lines.push(centerText(footerLine2, width));
	lines.push('');

	if (orderData.footer_message) {
		lines.push(centerText(orderData.footer_message, width));
		lines.push('');
	}

	return lines;
}

/**
 * Create a simple test receipt
 */
function createTestReceipt() {
	return formatReceipt({
		id: 'TEST001',
		receipt_number: 'TEST001',
		created_at: new Date().toISOString(),
		cashier_name: 'Test Cashier',
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
	});
}

module.exports = { formatReceipt, createTestReceipt };
