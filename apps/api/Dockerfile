# ==============================================================================
# MatrixChat Backend API - Production Multi-Stage Dockerfile
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Compile TypeScript
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Clean install all dependencies (including devDependencies required for tsc)
RUN npm ci

# Copy TypeScript configuration and source files
COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY drizzle/ ./drizzle/
COPY src/ ./src/

# Compile TypeScript to JavaScript (/app/dist)
RUN npm run build

# Prune devDependencies to keep the production runtime lean
RUN npm prune --omit=dev

# ------------------------------------------------------------------------------
# Stage 2: Minimal Production Runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Install dumb-init for proper PID 1 signal forwarding & zombie process reaping
RUN apk add --no-cache dumb-init

# Define production environment variables
ENV NODE_ENV=production \
    PORT=5000 \
    UPLOAD_DIR=/app/uploads

# Create uploads storage directory and assign ownership to unprivileged 'node' user
RUN mkdir -p /app/uploads && chown -R node:node /app

# Copy production node_modules from the builder stage
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

# Copy compiled JavaScript files and configuration
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/drizzle ./drizzle
COPY --chown=node:node --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Mount persistent volume for uploads
VOLUME ["/app/uploads"]

# Run as non-root user for container security
USER node

# Expose default API server port
EXPOSE 5000

# Health check to ensure service readiness
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Launch with dumb-init to handle process signals cleanly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
