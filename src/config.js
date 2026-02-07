const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const config = {
    server: {
        port: process.env.PORT || 3344,
        host: process.env.HOST || "0.0.0.0",
    },
    auth: {
        apiKey: (process.env.API_KEY || "").trim(),
    },
    printer: {
        type: process.env.PRINTER_TYPE || "usb",
        usb: {
            vendorId: process.env.USB_VENDOR_ID || null,
            productId: process.env.USB_PRODUCT_ID || null,
        },
    },
    receipt: {
        storeName: process.env.STORE_NAME || "XiPOS Store",
        storeAddress: process.env.STORE_ADDRESS || "",
        storePhone: process.env.STORE_PHONE || "",
        storeTaxId: process.env.STORE_TAX_ID || "",
        paperWidth: parseInt(process.env.PAPER_WIDTH, 10) || 48,
        currencySymbol: process.env.CURRENCY_SYMBOL || 'RM',
        encoding: process.env.PRINTER_ENCODING || 'GB18030',
        footerLine1: process.env.RECEIPT_FOOTER_LINE1 || 'Thank you for your purchase!',
        footerLine2: process.env.RECEIPT_FOOTER_LINE2 || 'Please come again',
    },
    cors: {
        origins: process.env.CORS_ORIGINS
            ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
            : ["http://localhost:5183", "http://localhost:5173"],
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
        printMax: parseInt(process.env.RATE_LIMIT_PRINT_MAX || '10', 10),
        testMax: parseInt(process.env.RATE_LIMIT_TEST_MAX || '3', 10),
    },
    debug: process.env.DEBUG === "true",
};

/**
 * Validate port number
 * @param {number} port - Port number to validate
 * @returns {boolean} - True if valid
 */
function validatePort(port) {
    const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        console.error(`[CONFIG ERROR] Invalid port: ${port}. Port must be between 1 and 65535.`);
        return false;
    }
    return true;
}

/**
 * Validate paper width
 * @param {number} width - Paper width to validate
 * @returns {boolean} - True if valid
 */
function validatePaperWidth(width) {
    const widthNum = typeof width === 'string' ? parseInt(width, 10) : width;
    if (widthNum !== 32 && widthNum !== 48) {
        console.error(`[CONFIG ERROR] Invalid paper width: ${width}. Paper width must be 32 or 48.`);
        return false;
    }
    return true;
}

/**
 * Validate printer type
 * @param {string} type - Printer type to validate
 * @returns {boolean} - True if valid
 */
function validatePrinterType(type) {
    const validTypes = ['usb'];
    if (!validTypes.includes(type)) {
        console.error(`[CONFIG ERROR] Invalid printer type: ${type}. Currently only USB printers are supported. Valid types: ${validTypes.join(', ')}.`);
        return false;
    }
    return true;
}

/**
 * Validate IP address format
 * @param {string} ip - IP address to validate
 * @returns {boolean} - True if valid
 */
function validateIPAddress(ip) {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
        console.error(`[CONFIG ERROR] Invalid IP address format: ${ip}. Expected format: x.x.x.x`);
        return false;
    }

    // Validate each octet is 0-255
    const octets = ip.split('.');
    for (const octet of octets) {
        const num = parseInt(octet, 10);
        if (num < 0 || num > 255) {
            console.error(`[CONFIG ERROR] Invalid IP address: ${ip}. Each octet must be between 0 and 255.`);
            return false;
        }
    }

    return true;
}

/**
 * Validate all configuration values
 * Exits process if any validation fails
 */
function validateConfig() {
    let valid = true;

    // Validate server port
    if (!validatePort(config.server.port)) {
        valid = false;
    }

    // Validate paper width
    if (!validatePaperWidth(config.receipt.paperWidth)) {
        valid = false;
    }

    // Validate printer type
    if (!validatePrinterType(config.printer.type)) {
        valid = false;
    }

    // Validate network printer IP if printer type is network
    if (config.printer.type === 'network' && config.printer.network && config.printer.network.ip) {
        if (!validateIPAddress(config.printer.network.ip)) {
            valid = false;
        }
    }

    // Validate API_KEY is set and not a placeholder
    const placeholderValues = ['your-api-key-here', 'your_api_key_here', 'changeme', ''];
    if (!config.auth.apiKey || placeholderValues.includes(config.auth.apiKey)) {
        console.error('[CONFIG ERROR] API_KEY is required. Set a strong API_KEY in your .env file.');
        valid = false;
    }

    // Exit if any validation failed
    if (!valid) {
        console.error('[CONFIG ERROR] Configuration validation failed. Please fix the errors above.');
        process.exit(1);
    }
}

// Run validation at module load time
validateConfig();

module.exports = { config };
