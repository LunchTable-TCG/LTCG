# Multi-stage build for Bun-based MCP HTTP Server
# Stage 1: Builder
FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies with frozen lockfile for reproducibility
RUN bun install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN bun run build

# Stage 2: Runtime
FROM oven/bun:1-slim

WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment variables
ENV MCP_TRANSPORT=http \
    NODE_ENV=production \
    PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD bun -e "const res = await fetch('http://localhost:3000/health'); process.exit(res.ok ? 0 : 1)"

# Start server
CMD ["bun", "dist/http-server.js"]
