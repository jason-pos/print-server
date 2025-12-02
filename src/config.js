const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const config = {
    server: {
        port: process.env.PORT || 3344,
        host: process.env.HOST || "0.0.0.0",
    },
    printer: {
        type: process.env.PRINTER_TYPE || "usb",
        usb: {
            vendorId: process.env.USB_VENDOR_ID || null,
            productId: process.env.USB_PRODUCT_ID || null,
        },
        bluetooth: {
            deviceAddress: process.env.BLUETOOTH_DEVICE_ADDRESS || null,
            channel: parseInt(process.env.BLUETOOTH_CHANNEL) || 1,
        },
        network: {
            ip: process.env.NETWORK_PRINTER_IP || "192.168.1.100",
            port: parseInt(process.env.NETWORK_PRINTER_PORT) || 9100,
        },
        serial: {
            port: process.env.SERIAL_PORT || "/dev/ttyUSB0",
            baudRate: parseInt(process.env.SERIAL_BAUDRATE) || 9600,
        },
    },
    receipt: {
        storeName: process.env.STORE_NAME || "XiPOS Store",
        storeAddress: process.env.STORE_ADDRESS || "",
        storePhone: process.env.STORE_PHONE || "",
        storeTaxId: process.env.STORE_TAX_ID || "",
        paperWidth: parseInt(process.env.PAPER_WIDTH) || 48,
    },
    debug: process.env.DEBUG === "true",
};

module.exports = { config };
