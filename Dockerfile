# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# shared/ must be present before tsc runs — server paths map @shared/* → ../shared/*
COPY shared/ ./shared/

# Install server deps before copying source (better layer caching)
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci

# Copy server source and compile TypeScript
COPY server/src/ ./server/src/
COPY server/tsconfig.json ./server/
RUN cd server && npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app/server

# Compiled output + all node_modules (tsconfig-paths is needed at runtime)
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules ./node_modules

# tsconfig-paths reads tsconfig.json at startup to resolve @shared/* aliases
COPY server/tsconfig.json .

# Shared source must sit at ../shared relative to WORKDIR (/app/server → /app/shared)
COPY --from=builder /app/shared /app/shared

EXPOSE 3001
CMD ["node", "-r", "tsconfig-paths/register", "dist/server/src/index.js"]
