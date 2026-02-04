const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'commonjs',
			globals: {
				...globals.node,
				...globals.es2021,
			},
		},
		rules: {
			'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			'no-console': 'off',
		},
	},
	{
		files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
		languageOptions: {
			globals: {
				...globals.jest,
			},
		},
	},
	{
		ignores: ['node_modules/**', 'dist/**', 'coverage/**'],
	},
];
