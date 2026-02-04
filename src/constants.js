/**
 * Xi Print Server Constants
 *
 * Centralized configuration for timeouts, delays, and retry behavior.
 * All values are in milliseconds.
 */

/**
 * Timeout for closing printer connection gracefully
 * If printer doesn't respond within this time, connection is forced closed
 * @type {number}
 */
const PRINTER_CLOSE_TIMEOUT = 2000;

/**
 * Timeout for test print operations
 * Test prints should complete within this duration
 * @type {number}
 */
const TEST_PRINT_TIMEOUT = 10000;

/**
 * Timeout for receipt print operations
 * Receipt prints should complete within this duration
 * Longer than test prints to accommodate larger receipts
 * @type {number}
 */
const RECEIPT_PRINT_TIMEOUT = 15000;

/**
 * Delay after print completion before cleanup
 * Gives printer time to finish physical printing and paper cutting
 * @type {number}
 */
const POST_PRINT_DELAY = 1000;

/**
 * Base delay for exponential backoff retry logic
 * Actual delay = RETRY_BASE_DELAY * 2^(attempt-1)
 * - Attempt 1: 1000ms (1s)
 * - Attempt 2: 2000ms (2s)
 * - Attempt 3: 4000ms (4s)
 * @type {number}
 */
const RETRY_BASE_DELAY = 1000;

/**
 * Maximum number of retry attempts for transient errors
 * @type {number}
 */
const MAX_RETRY_ATTEMPTS = 3;

module.exports = {
	PRINTER_CLOSE_TIMEOUT,
	TEST_PRINT_TIMEOUT,
	RECEIPT_PRINT_TIMEOUT,
	POST_PRINT_DELAY,
	RETRY_BASE_DELAY,
	MAX_RETRY_ATTEMPTS
};
