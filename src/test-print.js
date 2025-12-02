/**
 * Test print script
 * Run this to test the print server without starting the full server
 */
const { printTest } = require('./print-handler.js');

console.log('Testing printer...\n');

printTest()
	.then((result) => {
		console.log('✓ Success:', result.message);
		process.exit(0);
	})
	.catch((error) => {
		console.error('✗ Error:', error.message);
		process.exit(1);
	});
