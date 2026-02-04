module.exports = {
	testEnvironment: 'node',
	collectCoverageFrom: [
		'src/**/*.js',
		'!src/test-print.js'
	],
	coverageThreshold: {
		global: {
			branches: 50,
			functions: 50,
			lines: 50,
			statements: 50
		}
	},
	testMatch: [
		'**/tests/**/*.test.js'
	],
	verbose: true,
	forceExit: true,
	testTimeout: 10000
};
