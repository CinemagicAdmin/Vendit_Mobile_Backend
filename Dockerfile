# syntax=docker/dockerfile:1.7

# Build dependencies stage
FROM node:20-alpine AS deps
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code and config files
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

# Accept build arguments (if needed for environment-specific builds)
ARG NODE_ENV=production
ARG DATABASE_URL
ARG SUPABASE_URL
ARG SUPABASE_KEY

# Set environment variables for build
ENV NODE_ENV=$NODE_ENV

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install dumb-init
RUN apk add --no-cache dumb-init && \
    apk update && \
    apk upgrade

# Set production environment
ENV NODE_ENV=production

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# Copy build artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Copy static assets if they exist (uncomment if needed)
COPY src/public ./src/public

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Cloud Run sets PORT automatically (defaults to 8080)
# But allow override for local testing
ENV PORT=8080
EXPOSE 8080

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
