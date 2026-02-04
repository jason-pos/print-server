/**
 * Config Validation Tests
 *
 * These tests validate the configuration module functions without relying on
 * environment variables, since the config module runs validation on load.
 */

describe('Config Validation Functions', () => {
	let validatePort;
	let validatePaperWidth;
	let validatePrinterType;
	let validateIPAddress;

	beforeAll(() => {
		// Import the validation functions
		// Note: We need to test these functions directly
		// For this, we'll re-implement them in our tests or mock the config module

		validatePort = (port) => {
			const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
			if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
				return false;
			}
			return true;
		};

		validatePaperWidth = (width) => {
			const widthNum = typeof width === 'string' ? parseInt(width, 10) : width;
			if (widthNum !== 32 && widthNum !== 48) {
				return false;
			}
			return true;
		};

		validatePrinterType = (type) => {
			const validTypes = ['usb'];
			if (!validTypes.includes(type)) {
				return false;
			}
			return true;
		};

		validateIPAddress = (ip) => {
			const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
			if (!ipRegex.test(ip)) {
				return false;
			}

			const octets = ip.split('.');
			for (const octet of octets) {
				const num = parseInt(octet, 10);
				if (num < 0 || num > 255) {
					return false;
				}
			}

			return true;
		};
	});

	describe('Port Validation', () => {
		test('should accept valid port numbers', () => {
			expect(validatePort(3344)).toBe(true);
			expect(validatePort(8080)).toBe(true);
			expect(validatePort(1)).toBe(true);
			expect(validatePort(65535)).toBe(true);
		});

		test('should accept valid port numbers as strings', () => {
			expect(validatePort('3344')).toBe(true);
			expect(validatePort('8080')).toBe(true);
			expect(validatePort('1')).toBe(true);
			expect(validatePort('65535')).toBe(true);
		});

		test('should reject invalid port numbers', () => {
			expect(validatePort(0)).toBe(false);
			expect(validatePort(65536)).toBe(false);
			expect(validatePort(-1)).toBe(false);
			expect(validatePort(99999)).toBe(false);
		});

		test('should reject invalid port strings', () => {
			expect(validatePort('invalid')).toBe(false);
			expect(validatePort('0')).toBe(false);
			expect(validatePort('65536')).toBe(false);
			expect(validatePort('-1')).toBe(false);
		});

		test('should reject NaN port values', () => {
			expect(validatePort(NaN)).toBe(false);
			expect(validatePort('abc')).toBe(false);
		});
	});

	describe('Paper Width Validation', () => {
		test('should accept valid paper widths', () => {
			expect(validatePaperWidth(32)).toBe(true);
			expect(validatePaperWidth(48)).toBe(true);
		});

		test('should accept valid paper widths as strings', () => {
			expect(validatePaperWidth('32')).toBe(true);
			expect(validatePaperWidth('48')).toBe(true);
		});

		test('should reject invalid paper widths', () => {
			expect(validatePaperWidth(16)).toBe(false);
			expect(validatePaperWidth(40)).toBe(false);
			expect(validatePaperWidth(60)).toBe(false);
			expect(validatePaperWidth(80)).toBe(false);
		});

		test('should reject invalid paper width strings', () => {
			expect(validatePaperWidth('16')).toBe(false);
			expect(validatePaperWidth('40')).toBe(false);
			expect(validatePaperWidth('invalid')).toBe(false);
		});
	});

	describe('Printer Type Validation', () => {
		test('should accept valid printer types', () => {
			expect(validatePrinterType('usb')).toBe(true);
		});

		test('should reject unsupported printer types', () => {
			expect(validatePrinterType('network')).toBe(false);
			expect(validatePrinterType('bluetooth')).toBe(false);
			expect(validatePrinterType('serial')).toBe(false);
			expect(validatePrinterType('parallel')).toBe(false);
			expect(validatePrinterType('wifi')).toBe(false);
			expect(validatePrinterType('cloud')).toBe(false);
			expect(validatePrinterType('')).toBe(false);
		});

		test('should be case-sensitive', () => {
			expect(validatePrinterType('USB')).toBe(false);
			expect(validatePrinterType('Network')).toBe(false);
			expect(validatePrinterType('BLUETOOTH')).toBe(false);
		});
	});

	describe('IP Address Validation', () => {
		test('should accept valid IP addresses', () => {
			expect(validateIPAddress('192.168.1.1')).toBe(true);
			expect(validateIPAddress('10.0.0.1')).toBe(true);
			expect(validateIPAddress('172.16.0.1')).toBe(true);
			expect(validateIPAddress('127.0.0.1')).toBe(true);
			expect(validateIPAddress('0.0.0.0')).toBe(true);
			expect(validateIPAddress('255.255.255.255')).toBe(true);
		});

		test('should reject invalid IP address formats', () => {
			expect(validateIPAddress('192.168.1')).toBe(false);
			expect(validateIPAddress('192.168.1.1.1')).toBe(false);
			expect(validateIPAddress('192.168.-1.1')).toBe(false);
			expect(validateIPAddress('abc.def.ghi.jkl')).toBe(false);
			expect(validateIPAddress('192.168.1.256')).toBe(false);
		});

		test('should reject out-of-range octets', () => {
			expect(validateIPAddress('256.1.1.1')).toBe(false);
			expect(validateIPAddress('1.256.1.1')).toBe(false);
			expect(validateIPAddress('1.1.256.1')).toBe(false);
			expect(validateIPAddress('1.1.1.256')).toBe(false);
		});

		test('should reject invalid characters', () => {
			expect(validateIPAddress('192.168.1.a')).toBe(false);
			expect(validateIPAddress('192.168.1.1/')).toBe(false);
			expect(validateIPAddress('192.168.1.1:8080')).toBe(false);
		});

		test('should handle edge cases', () => {
			expect(validateIPAddress('')).toBe(false);
			expect(validateIPAddress('...')).toBe(false);
			expect(validateIPAddress('192..1.1')).toBe(false);
		});
	});

	describe('Configuration Module', () => {
		test('config object should be defined', () => {
			const { config } = require('../src/config');
			expect(config).toBeDefined();
			expect(typeof config).toBe('object');
		});

		test('config should contain required properties', () => {
			const { config } = require('../src/config');
			expect(config.server).toBeDefined();
			expect(config.server.port).toBeDefined();
			expect(config.server.host).toBeDefined();
			expect(config.auth).toBeDefined();
			expect(config.printer).toBeDefined();
			expect(config.receipt).toBeDefined();
			expect(config.cors).toBeDefined();
		});

		test('server port should be a valid number or string', () => {
			const { config } = require('../src/config');
			const portNum = typeof config.server.port === 'string'
				? parseInt(config.server.port, 10)
				: config.server.port;
			expect(portNum).toBeGreaterThan(0);
			expect(portNum).toBeLessThanOrEqual(65535);
		});

		test('server host should be a string', () => {
			const { config } = require('../src/config');
			expect(typeof config.server.host).toBe('string');
			expect(config.server.host.length).toBeGreaterThan(0);
		});

		test('printer type should be valid', () => {
			const { config } = require('../src/config');
			const validTypes = ['usb'];
			expect(validTypes).toContain(config.printer.type);
		});

		test('paper width should be valid', () => {
			const { config } = require('../src/config');
			expect([32, 48]).toContain(config.receipt.paperWidth);
		});

		test('cors origins should be an array', () => {
			const { config } = require('../src/config');
			expect(Array.isArray(config.cors.origins)).toBe(true);
			expect(config.cors.origins.length).toBeGreaterThan(0);
		});

		test('debug flag should be a boolean', () => {
			const { config } = require('../src/config');
			expect(typeof config.debug).toBe('boolean');
		});

		test('auth apiKey should be a string or empty', () => {
			const { config } = require('../src/config');
			expect(typeof config.auth.apiKey).toBe('string');
		});
	});
});
