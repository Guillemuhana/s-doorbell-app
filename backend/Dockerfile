# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install deps first (cache layer)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Create required directories
RUN mkdir -p uploads logs

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 && \
    chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "server.js"]
