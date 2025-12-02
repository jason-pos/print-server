# XiPOS Print Server Dockerfile
# Optimized single-stage build

FROM node:20-alpine

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    linux-headers \
    eudev-dev \
    libusb-dev

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    rm -rf /root/.npm /tmp/*

# Remove build dependencies and install runtime dependencies
RUN apk del python3 make g++ linux-headers eudev-dev libusb-dev && \
    apk add --no-cache eudev eudev-libs libusb

# Copy application files
COPY src ./src

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    touch .env && chown -R nodejs:nodejs /app

EXPOSE 3344

USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3344/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/server.js"]
