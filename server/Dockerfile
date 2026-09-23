# syntax=docker/dockerfile:1

# -------------------- Base image (build toolchain: Bun) --------------------
FROM oven/bun:1 AS base
WORKDIR /app

# -------------------- Install dependencies --------------------
# Full install (incl. devDependencies) is intentional: the build needs
# @nestjs/cli + tsc-alias, and runtime migrations use drizzle-kit (a devDep).
FROM base AS deps
COPY package.json bun.lock bun.lockb* ./
RUN bun install --frozen-lockfile --ignore-scripts

# -------------------- Build stage --------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG SERVER_ENV_BASE64
# If a base64-encoded env is provided as a build-arg, decode it into /app/.env
RUN if [ -n "${SERVER_ENV_BASE64:-}" ]; then \
      printf '%s' "$SERVER_ENV_BASE64" | base64 --decode > /app/.env; \
    fi
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN bun run build:prod

# -------------------- Runtime stage --------------------
# Node base (matches .nvmrc v22) because deployment.sh starts the app with
# `node dist/src/main.js`. The Bun binary is added below so the unchanged
# deployment.sh can still run `bunx drizzle-kit migrate` and the seed step.
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=development

ENV NO_COLOR=true

# Bring in Bun (a single static executable) and expose `bunx`.
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
RUN ln -s /usr/local/bin/bun /usr/local/bin/bunx

# Dependencies + compiled output, owned by the non-root `node` user.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

# Files needed for Drizzle migrations at runtime (config + schema + SQL in src/migrations).
COPY --chown=node:node package.json drizzle.config.ts ./
COPY --chown=node:node src ./src

# NOTE: .env is intentionally NOT copied — inject env at runtime
# (docker run --env-file / -e, or your orchestrator's secret store).

# Drop root privileges (the node image ships a non-root `node` user, UID 1000).
USER node

# API server listens on 5000 in production.
EXPOSE 5000

# Waits for Postgres, runs migrations + seeders, then `node dist/src/main.js`.
CMD ["node", "dist/src/main.js"]
