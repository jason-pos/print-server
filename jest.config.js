module.exports = {
	testEnvironment: 'node',
	collectCoverageFrom: [
		'src/**/*.js',
		'!src/test-print.js'
	],
	coverageThreshold: {
		global: {
			branches: 70,
			functions: 70,
			lines: 70,
			statements: 70
		}
	},
	testMatch: [
		'**/tests/**/*.test.js'
	],
	verbose: true,
	forceExit: true,
	testTimeout: 10000
};
