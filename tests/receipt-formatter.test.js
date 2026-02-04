const { formatReceipt, createTestReceipt } = require('../src/receipt-formatter');
const { config } = require('../src/config');

describe('Receipt Formatter', () => {
	describe('Basic Receipt Formatting', () => {
		test('should format a simple receipt with basic items', () => {
			const orderData = {
				id: 'ORD001',
				receipt_number: 'RCP001',
				created_at: '2024-02-03T10:00:00Z',
				cashier_name: 'John Doe',
				items: [
					{
						product_name: 'Coffee',
						quantity: 1,
						sell_price: 5.00
					}
				],
				subtotal: 5.00,
				tax: 0,
				discount: 0,
				total_amount: 5.00,
				payment_method: 'cash',
				payment_amount: 5.00
			};

			const lines = formatReceipt(orderData);
			expect(Array.isArray(lines)).toBe(true);
			expect(lines.length).toBeGreaterThan(0);
			expect(lines.some(line => line.includes('Coffee'))).toBe(true);
			expect(lines.some(line => line.includes('RM 5.00'))).toBe(true);
		});

		test('should handle empty items array', () => {
			const orderData = {
				id: 'ORD002',
				receipt_number: 'RCP002',
				created_at: new Date().toISOString(),
				items: [],
				subtotal: 0,
				total_amount: 0,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			expect(Array.isArray(lines)).toBe(true);
			expect(lines.length).toBeGreaterThan(0);
		});

		test('should format multiple items correctly', () => {
			const orderData = {
				id: 'ORD003',
				receipt_number: 'RCP003',
				created_at: new Date().toISOString(),
				items: [
					{ product_name: 'Item 1', quantity: 2, sell_price: 10.00 },
					{ product_name: 'Item 2', quantity: 1, sell_price: 20.00 },
					{ product_name: 'Item 3', quantity: 3, sell_price: 5.50 }
				],
				subtotal: 56.50,
				total_amount: 56.50,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			expect(lines.some(line => line.includes('Item 1'))).toBe(true);
			expect(lines.some(line => line.includes('Item 2'))).toBe(true);
			expect(lines.some(line => line.includes('Item 3'))).toBe(true);
		});
	});

	describe('Long Product Names', () => {
		test('should handle long product names that exceed paper width', () => {
			const longName = 'A'.repeat(100); // Much longer than typical paper width (48)
			const orderData = {
				id: 'ORD004',
				receipt_number: 'RCP004',
				created_at: new Date().toISOString(),
				items: [
					{ product_name: longName, quantity: 1, sell_price: 10.00 }
				],
				subtotal: 10.00,
				total_amount: 10.00,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			expect(Array.isArray(lines)).toBe(true);
			// Should truncate the long name
			const itemLine = lines.find(line => line.includes('A'));
			expect(itemLine.length).toBeLessThanOrEqual(config.receipt.paperWidth);
		});

		test('should handle product names with special characters', () => {
			const orderData = {
				id: 'ORD005',
				receipt_number: 'RCP005',
				created_at: new Date().toISOString(),
				items: [
					{ product_name: 'Coffee & Tea (Hot)', quantity: 1, sell_price: 5.00 },
					{ product_name: 'Item@Store#123', quantity: 2, sell_price: 3.50 }
				],
				subtotal: 12.00,
				total_amount: 12.00,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			expect(lines.some(line => line.includes('Coffee'))).toBe(true);
			expect(lines.some(line => line.includes('Item@'))).toBe(true);
		});

		test('should handle Chinese characters', () => {
			const orderData = {
				id: 'ORD006',
				receipt_number: 'RCP006',
				created_at: new Date().toISOString(),
				items: [
					{ product_name: '咖啡', quantity: 1, sell_price: 5.00 },
					{ product_name: '奶茶', quantity: 2, sell_price: 3.50 },
					{ product_name: '特色鸡尾酒', quantity: 1, sell_price: 12.00 }
				],
				subtotal: 24.00,
				total_amount: 24.00,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			expect(Array.isArray(lines)).toBe(true);
			expect(lines.length).toBeGreaterThan(0);
		});
	});

	describe('Quantity and Price Handling', () => {
		test('should handle zero quantities', () => {
			const orderData = {
				id: 'ORD007',
				receipt_number: 'RCP007',
				created_at: new Date().toISOString(),
				items: [
					{ product_name: 'Item 1', quantity: 0, sell_price: 10.00 }
				],
				subtotal: 0,
				total_amount: 0,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			expect(Array.isArray(lines)).toBe(true);
			// Zero quantity should show as "0 x" in the quantity line
			const hasZeroQty = lines.some(line => line.includes('0') && line.includes('x'));
			expect(hasZeroQty).toBe(true);
		});

		test('should handle negative amounts gracefully', () => {
			const orderData = {
				id: 'ORD008',
				receipt_number: 'RCP008',
				created_at: new Date().toISOString(),
				items: [
					{ product_name: 'Refund', quantity: 1, sell_price: -10.00 }
				],
				subtotal: -10.00,
				total_amount: -10.00,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			expect(Array.isArray(lines)).toBe(true);
		});

		test('should handle fractional quantities', () => {
			const orderData = {
				id: 'ORD009',
				receipt_number: 'RCP009',
				created_at: new Date().toISOString(),
				items: [
					{ product_name: 'Milk (L)', quantity: 0.5, sell_price: 4.00 },
					{ product_name: 'Juice (L)', quantity: 1.5, sell_price: 3.00 }
				],
				subtotal: 6.50,
				total_amount: 6.50,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			expect(lines.some(line => line.includes('0.5'))).toBe(true);
			expect(lines.some(line => line.includes('1.5'))).toBe(true);
		});

		test('should format currency correctly', () => {
			const orderData = {
				id: 'ORD010',
				receipt_number: 'RCP010',
				created_at: new Date().toISOString(),
				items: [
					{ product_name: 'Item', quantity: 1, sell_price: 9.99 }
				],
				subtotal: 9.99,
				total_amount: 9.99,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			expect(lines.some(line => line.includes('RM 9.99'))).toBe(true);
		});
	});

	describe('Receipt Components', () => {
		test('should include store information when provided', () => {
			const orderData = {
				id: 'ORD011',
				receipt_number: 'RCP011',
				created_at: new Date().toISOString(),
				items: [{ product_name: 'Item', quantity: 1, sell_price: 5.00 }],
				subtotal: 5.00,
				total_amount: 5.00,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			// Store name might be uppercase in the receipt
			if (config.receipt.storeName) {
				const storeNameUppercase = config.receipt.storeName.toUpperCase();
				const hasStoreName = lines.some(line =>
					line.includes(config.receipt.storeName) ||
					line.includes(storeNameUppercase)
				);
				expect(hasStoreName).toBe(true);
			} else {
				// If no store name is configured, just verify we got lines
				expect(lines.length).toBeGreaterThan(0);
			}
		});

		test('should include customer name when provided', () => {
			const orderData = {
				id: 'ORD012',
				receipt_number: 'RCP012',
				created_at: new Date().toISOString(),
				customer_name: 'Jane Smith',
				items: [{ product_name: 'Item', quantity: 1, sell_price: 5.00 }],
				subtotal: 5.00,
				total_amount: 5.00,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			expect(lines.some(line => line.includes('Jane Smith'))).toBe(true);
		});

		test('should calculate tax correctly', () => {
			const orderData = {
				id: 'ORD013',
				receipt_number: 'RCP013',
				created_at: new Date().toISOString(),
				items: [{ product_name: 'Item', quantity: 1, sell_price: 100.00 }],
				subtotal: 100.00,
				tax: 6.00,
				discount: 0,
				total_amount: 106.00,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			expect(lines.some(line => line.includes('RM 6.00'))).toBe(true);
		});

		test('should include discount when provided', () => {
			const orderData = {
				id: 'ORD014',
				receipt_number: 'RCP014',
				created_at: new Date().toISOString(),
				items: [{ product_name: 'Item', quantity: 1, sell_price: 100.00 }],
				subtotal: 100.00,
				tax: 0,
				discount: 10.00,
				total_amount: 90.00,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			expect(lines.some(line => line.includes('Discount'))).toBe(true);
		});

		test('should show change for cash payment when applicable', () => {
			const orderData = {
				id: 'ORD015',
				receipt_number: 'RCP015',
				created_at: new Date().toISOString(),
				items: [{ product_name: 'Item', quantity: 1, sell_price: 10.00 }],
				subtotal: 10.00,
				total_amount: 10.00,
				payment_method: 'cash',
				payment_amount: 50.00
			};

			const lines = formatReceipt(orderData);
			expect(lines.some(line => line.includes('Change'))).toBe(true);
			expect(lines.some(line => line.includes('RM 40.00'))).toBe(true);
		});

		test('should display correct payment method names', () => {
			const paymentMethods = ['cash', 'credit', 'reward', 'qrpay'];

			paymentMethods.forEach(method => {
				const orderData = {
					id: `ORD_${method}`,
					receipt_number: `RCP_${method}`,
					created_at: new Date().toISOString(),
					items: [{ product_name: 'Item', quantity: 1, sell_price: 5.00 }],
					subtotal: 5.00,
					total_amount: 5.00,
					payment_method: method,
					payment_amount: 5.00
				};

				const lines = formatReceipt(orderData);
				expect(lines.some(line => line.includes('Payment'))).toBe(true);
			});
		});

		test('should include member information when provided', () => {
			const orderData = {
				id: 'ORD016',
				receipt_number: 'RCP016',
				created_at: new Date().toISOString(),
				items: [{ product_name: 'Item', quantity: 1, sell_price: 5.00 }],
				subtotal: 5.00,
				total_amount: 5.00,
				payment_method: 'credit',
				payment_amount: 5.00,
				payment_data: {
					member_name: 'John Member',
					member_code: 'MEM123456'
				}
			};

			const lines = formatReceipt(orderData);
			expect(lines.some(line => line.includes('Member'))).toBe(true);
		});

		test('should include footer message when provided', () => {
			const orderData = {
				id: 'ORD017',
				receipt_number: 'RCP017',
				created_at: new Date().toISOString(),
				items: [{ product_name: 'Item', quantity: 1, sell_price: 5.00 }],
				subtotal: 5.00,
				total_amount: 5.00,
				payment_method: 'cash',
				footer_message: 'Custom Footer Message'
			};

			const lines = formatReceipt(orderData);
			expect(lines.some(line => line.includes('Custom Footer Message'))).toBe(true);
		});
	});

	describe('Line Width Compliance', () => {
		test('all lines should not exceed paper width', () => {
			const orderData = {
				id: 'ORD018',
				receipt_number: 'RCP018',
				created_at: new Date().toISOString(),
				items: [
					{ product_name: 'Long Product Name ' + 'X'.repeat(50), quantity: 1, sell_price: 10.00 }
				],
				subtotal: 10.00,
				total_amount: 10.00,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			lines.forEach(line => {
				expect(line.length).toBeLessThanOrEqual(config.receipt.paperWidth);
			});
		});
	});

	describe('Test Receipt Creation', () => {
		test('should create a valid test receipt', () => {
			const lines = createTestReceipt();
			expect(Array.isArray(lines)).toBe(true);
			expect(lines.length).toBeGreaterThan(0);
			expect(lines.some(line => line.includes('Test Product'))).toBe(true);
		});
	});

	describe('Date and Time Formatting', () => {
		test('should format date and time correctly', () => {
			const testDate = '2024-02-03T10:30:00Z';
			const orderData = {
				id: 'ORD019',
				receipt_number: 'RCP019',
				created_at: testDate,
				items: [{ product_name: 'Item', quantity: 1, sell_price: 5.00 }],
				subtotal: 5.00,
				total_amount: 5.00,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			// Should contain date and time information
			expect(lines.some(line => line.includes('Date'))).toBe(true);
			expect(lines.some(line => line.includes('Time'))).toBe(true);
		});

		test('should handle missing created_at field', () => {
			const orderData = {
				id: 'ORD020',
				receipt_number: 'RCP020',
				items: [{ product_name: 'Item', quantity: 1, sell_price: 5.00 }],
				subtotal: 5.00,
				total_amount: 5.00,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			expect(Array.isArray(lines)).toBe(true);
			expect(lines.length).toBeGreaterThan(0);
		});
	});

	describe('Edge Cases', () => {
		test('should handle very large totals', () => {
			const orderData = {
				id: 'ORD021',
				receipt_number: 'RCP021',
				created_at: new Date().toISOString(),
				items: [
					{ product_name: 'Premium Item', quantity: 1000, sell_price: 9999.99 }
				],
				subtotal: 9999990.00,
				total_amount: 9999990.00,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			expect(Array.isArray(lines)).toBe(true);
		});

		test('should handle items with missing optional fields', () => {
			const orderData = {
				id: 'ORD022',
				receipt_number: 'RCP022',
				created_at: new Date().toISOString(),
				items: [
					{ quantity: 1, sell_price: 5.00 }, // Missing product_name
					{ product_name: 'Item', quantity: 1 }, // Missing sell_price
					{ product_name: 'Item' } // Missing quantity and sell_price
				],
				subtotal: 5.00,
				total_amount: 5.00,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			expect(Array.isArray(lines)).toBe(true);
			expect(lines.length).toBeGreaterThan(0);
		});

		test('should use fallback receipt number when not provided', () => {
			const orderData = {
				id: 'ORD023',
				created_at: new Date().toISOString(),
				items: [{ product_name: 'Item', quantity: 1, sell_price: 5.00 }],
				subtotal: 5.00,
				total_amount: 5.00,
				payment_method: 'cash'
			};

			const lines = formatReceipt(orderData);
			expect(lines.some(line => line.includes('Receipt #'))).toBe(true);
		});
	});
});
